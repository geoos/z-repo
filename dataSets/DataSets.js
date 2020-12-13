const mongo = require("../minz/MongoDB");
const variables = require("../minz/Variables");
const dimensions = require("../minz/Dimensions");
const logs = require("../lib/Logs");
const http = require("http");
const https = require("https");
const moment = require("moment-timezone");

class DataSets {
    static get instance() {
        if (DataSets.singleton) return DataSets.singleton;
        DataSets.singleton = new DataSets();
        return DataSets.singleton;
    }

    constructor() {
        this.getDataSets(); // Create codes
    }

    get dataSets() {
        return require("./../lib/Config").config.dataSets;
    }

    getDataSets() {
        return Object.keys(this.dataSets).reduce((list, dsCode) => {
            this.dataSets[dsCode].code = dsCode;
            list.push(this.dataSets[dsCode]);
            return list;
        }, [])
    }

    async init() {
        if (!mongo.isInitialized()) return;
        try {
            let dss = this.getDataSets();
            for (let ds of dss) {
                let col = await mongo.collection(ds.code);
                await col.createIndex({time:1});
            }
            await logs.debug("DataSets initialized from Config")
        } catch (error) {
            throw error;
        }
    }

    async getRowsCount(dsCode, fromTime, toTime, filter) {
        try {
            let col = await mongo.collection(dsCode);
            return col.find().count();
        } catch (error) {
            throw error;
        }
    }
    async getRows(startRow, nRows, dsCode, fromTime, toTime, filter) {
        try {
            let col = await mongo.collection(dsCode);
            let rows = await col.find().sort({time:1}).skip(startRow).limit(nRows).map(r => {
                r._id = r._id.toString()
                return r;
            }).toArray();
            return rows;
        } catch (error) {
            throw error;
        }
    }

    async getLastTime(dsCode) {
        try {
            let col = await mongo.collection(dsCode);
            let rows = await col.find({}).sort({time:-1}).limit(1).toArray();
            if (!rows.length) return null;
            return rows[0].time;
        } catch (error) {
            throw error;
        }
    } 

    
    buildVarPostRow(dsRow, trigger) {
        let varRow = {variable:trigger.variable, time:dsRow.time, data:{}};
        if (typeof trigger.value == "string") varRow.value = dsRow[trigger.value];
        if (isNaN(varRow.value)) return null;
        else varRow.value = dsRow[trigger.value];
        if (trigger.data) {
            trigger.data.forEach(field => {
                if (field.from) varRow.data[field.to] = dsRow[field.from];
                else if (field.constant) varRow.data[field.to] = field.constant;
            })
        }
        return varRow;
    }

    buildDimPostRow(dsRow, trigger) {
        let dimRow = {code:dsRow[trigger.code], name:dsRow[trigger.name]};
        if (trigger.data) {
            trigger.data.forEach(field => {
                if (field.from) dimRow[field.to] = dsRow[field.from];
                else if (field.constant) dimRow[field.to] = field.constant;
            })
        }
        return dimRow;
    }

    getDSKey(ds) {
        let keyFields = ds.columns.filter(c => (c.key));
        if (!keyFields.length) return null;
        if (keyFields.length > 1) throw "Multiple key columns not supported in dataSets";
        return keyFields[0];
    }
    async importBatch(dsCode, rows) {
        try {
            let ds = this.dataSets[dsCode];
            if (!ds) throw "No se encontró el dataSet '" + dsCode + "'"
            let col = await mongo.collection(dsCode);
            let key = this.getDSKey(ds);            
            if (key) {
                rows.forEach(r => r._id = r[key.code]);
                for (let r of rows) {
                    let updateDoc = Object.keys(r).reduce((doc, field) => {
                        if (field != "_id") doc[field] = r[field];
                        return doc;
                    }, {})
                    await col.updateMany({_id:r._id}, {$set:updateDoc}, {upsert:true});
                }
            } else {
                await col.insertMany(rows);
            }
            let triggers = (ds.triggers || []).filter(t => (t.type == "postVariable"));
            for (let trigger of triggers) {
                let varRows = rows.reduce((list, dsRow) => {
                    let varPostRow = this.buildVarPostRow(dsRow, trigger);
                    if (varPostRow) list.push(varPostRow);
                    return list;
                }, []);
                await variables.postDataBatch(varRows);
            }
            triggers = (ds.triggers || []).filter(t => (t.type == "postDimension"));
            for (let trigger of triggers) {
                for (let row of rows) {
                    await dimensions.addOrUpdateRow(trigger.dimension, this.buildDimPostRow(row, trigger))
                }
            }
            return {status:"ok"}
        } catch (error) {
            throw error;
        }
    }


    importRow(dsCode, row) {
        return this.importBatch(dsCode, [row]);
    }

    downloadFile(url) {
        return new Promise((resolve, reject) => {
            let prov = url.startsWith("https")?https:http;
            prov.get(url, res => {
                if (res.statusCode != 200) {
                    reject("StatusCode: " + res.statusCode);
                    return;
                }
                res.setEncoding("utf8");
                let rawData = "";
                res.on("data", chunk => {
                    //console.log("data", chunk)
                    rawData += chunk;
                });
                res.on("error", err => {
                    res.resume();
                    reject(err)
                });
                res.on("end", _ => resolve(rawData));
            })
        })
    }

    async syncDataSet(dsCode, importIndex) {
        try {
            let ds = this.dataSets[dsCode];
            let imp = ds.imports[importIndex];
            logs.debug("Synchronizing dataSet '" + dsCode + "' from url:" + imp.url)
            let timeTreshold;
            if (imp.incremental) {
                timeTreshold = await this.getLastTime(dsCode);
                if (timeTreshold) {
                    let timeZone = require("../lib/Config").config.timeZone;
                    let m = moment.tz(timeTreshold, timeZone);
                    logs.debug("  => Importing records after " + m.format("YYYY-MM-DD HH:mm:ss"));
                }
            }
            let src = await this.downloadFile(imp.url);
            let rows;
            if (imp.format == "csv") {
                rows = this.parseCSVRows(ds, imp, src, timeTreshold);
            } else throw "Import format '" + imp.format + "' not handled for dataSet " + ds.code;
            let batch = [], batchSize = imp.batchSize || 1;
            for (let i=0; i< rows.length; i++) {
                let row = rows[i];
                if (i % 100 == 0) logs.debug("  => Imported " + i + " / " + rows.length);
                batch.push(row);
                if (batchSize == batch.length || i == rows.length - 1) {
                    await this.importBatch(dsCode, batch);
                    batch = [];
                }
            }
            logs.debug("Synchronization Finished");
        } catch (error) {
            throw error;
        }
    }

    parseCSVRows(ds, imp, csv, timeTreshold) {
        let rows=[], lines = csv.split("\n");
        let separator = imp.separator || ",";
        let timeZone = require("../lib/Config").config.timeZone;
        let timeColumn = ds.columns.find(c => (c.time));
        let colsMap = ds.columns.reduce((map, col) => {
            map[col.code] = col;
            return map;
        }, {})
        let transformMap = {};
        for (let i=0; i<lines.length; i++) {
            if (!i && imp.skipFirstLine) continue;
            let line = lines[i].trim();
            if (!line.length) continue;
            let fields = line.split(separator);
            let dsRow = {}, validRow = true;
            for (let name in imp.mapFrom) {
                let col = colsMap[name];
                if (col) {
                    let value;
                    let fieldDef = imp.mapFrom[name];
                    if (typeof fieldDef == "number") {
                        value = fields[fieldDef]
                    } else {
                        if (fieldDef.timeFormat) {
                            let v = fields[fieldDef.columnIndex]
                            let dt = moment.tz(v, fieldDef.timeFormat, timeZone);
                            value = dt.valueOf();
                        } else if (fieldDef.transform) {
                            let f = transformMap[name];
                            if (!f) {
                                try {
                                    f = eval("(" + fieldDef.transform + ")");
                                } catch(error) {
                                    console.error(error);
                                    logs.error("Error parsing transform '" + fieldDef.transform + "'");
                                    return [];
                                }
                                transformMap[name] = f;
                            }
                            let v = fields[fieldDef.columnIndex]
                            value = f(v);
                        }
                    }
                    if (col.type == "number") {
                        value = parseFloat(value);
                        if (isNaN(value)) validRow = false;
                        else dsRow[name] = value;
                    } else {
                        dsRow[name] = value;
                    }
                }                
            }
            if (validRow) {
                if (timeColumn) {
                    dsRow.time = dsRow[timeColumn.code];
                }
                if (!timeTreshold || dsRow.time > timeTreshold) {
                    rows.push(dsRow);
                }
            }
        }
        return rows;
    }
}

module.exports = DataSets.instance;