const mongo = require("../minz/MongoDB");
const variables = require("../minz/Variables");
const dimensions = require("../minz/Dimensions");
const logs = require("../lib/Logs");

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
}

module.exports = DataSets.instance;