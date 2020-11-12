const mongo = require("../minz/MongoDB");
const variables = require("../minz/Variables");
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
        else varRow.value = trigger.value;
        if (trigger.data) {
            trigger.data.forEach(field => {
                if (field.from) varRow.data[field.to] = dsRow[field.from];
                else if (field.constant) varRow.data[field.to] = field.constant;
            })
        }
        return varRow;
    }
    async importBatch(dsCode, rows) {
        try {
            let ds = this.dataSets[dsCode];
            if (!ds) throw "No se encontró el dataSet '" + dsCode + "'"
            let col = await mongo.collection(dsCode);
            let ids = await col.insertMany(rows);
            let triggers = ds.triggers || [];
            triggers = triggers.filter(t => (t.type == "postVariable"));
            for (let trigger of triggers) {
                let varRows = rows.reduce((list, dsRow) => {
                    list.push(this.buildVarPostRow(dsRow, trigger));
                    return list;
                }, []);
                await variables.postDataBatch(varRows);
            }
        } catch (error) {
            throw error;
        }
    }
    async importRow(dsCode, row) {
        try {
            
        } catch (error) {
            throw error;
        }
    }
}

module.exports = DataSets.instance;