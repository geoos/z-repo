'use strict';

const config = require("./Config");
const mongo = require('./MongoDB');
const dimensions = require("./Dimensions");
const moment = require("moment-timezone");

const temporalityLevel = {
    "5m":{level:0, name:"5 min."},
    "15m":{level:1, name:"15 min."},
    "30m":{level:2, name:"30 min."},
    "1h":{level:3, name:"1 hour"},
    "6h":{level:4, name:"6 hours"},
    "12h":{level:5, name:"12 hours"},
    "1d":{level:6, name:"1 day"},
    "1M":{level:7, name:"1 month"},
    "3M":{level:8, name:"3 months"},
    "4M":{level:9, name:"4 months"},
    "6M":{level:10, name:"6 months"},
    "1y":{level:11, name:"1 year"}
};

function getTemporalityCodeByLevel(level) {
    let found = null;
    Object.keys(temporalityLevel).forEach(code => {
        if (temporalityLevel[code].level == level) found = code;
    });
    return found;
}

class Variables {
    static get instance() {
        if (!Variables.singleton) Variables.singleton = new Variables();
        return Variables.singleton;
    }
    constructor() {
        this.variables = null;
        this.varIndexerPipes = {};
    }

    async init() {
        try {
            await mongo.collection("z_variables");
            await this.loadVariables();
        } catch(error) {
            throw error;
        }
    }

    // Variables
    async loadVariables() {
        try {
            this.variables = {};
            let zVariables = await mongo.collection("z_variables");
            let rows = await zVariables.find().toArray();
            rows.forEach(r => {
                if (!r.classifiers) r.classifiers = [];
                this.variables[r.code] = r;            
            });
        } catch(error) {
            throw error;
        }
    }
    getVariables(filter) {
        let f = filter?filter.toLowerCase():null;
        return Object.keys(this.variables)
            .map(code => this.variables[code])
            .filter(v => (!f || v.code.toLowerCase().indexOf(f) >= 0 || v.name.toLowerCase().indexOf(f) >= 0))
            .sort((v1, v2) => {return v1.name > v2.name?1:(v1.name < v2.name?-1:0)})
    }
    getVariable(code) {
        return this.variables[code];
    }
    async recreateIndexes(variable) {
        try {
            let col = await mongo.collection(variable.code);
            try {
                await col.dropIndexes();
            } catch(error) {
                console.warn("Can't drop indexes on '" + variable.code + "':" + error.toString())
            }
            await col.createIndex({time:1});
            if (variable.classifiers.length) {                
                var dimIdx = {};
                for (let i=0; i<variable.classifiers.length; i++) {
                    dimIdx[variable.classifiers[i].fieldName] = 1;

                    let index = {};
                    index[variable.classifiers[i].fieldName] = 1;
                    await (await col.createIndex(index));
                }
                await col.createIndex(dimIdx);
            }
        } catch(error) {
            console.log(error);
            throw(error);
        }
    }
    async addVariable(variable) {
        try {
            if (this.variables[variable.code]) throw "Variable '" + variable.code + "' already exists";
            variable.classifiers = variable.classifiers || [];
            if (!variable.code || !variable.name || !variable.temporality) {
                throw "Variable must include code, name and temporality";
            }
            variable.classifiers.forEach(c => {
                if (!c.fieldName || !c.name || !c.dimensionCode || !c.defaultValue) {
                    throw "Classifier must include fieldName, name, dimensionCode and defaultValue";
                }
            })
            try {
                if (!variable.classifiers) variable.classifiers = [];
                await mongo.collection(variable.code);
                await this.recreateIndexes(variable);
            } catch(error) {
                throw("Cannot create Mongo Collection for variable:" + error.toString());
            }
            variable._id = variable.code;
            variable.temporality = variable.temporality || "1h";            
            variable.saveDetails = variable.saveDetails?true:false;
            let zVariables = await mongo.collection("z_variables");
            await zVariables.insertOne(variable);
            await this.loadVariables();
            return variable;
        } catch(error) {
            throw error;
        }
    }
    async saveVariable(variable) {
        try {
            let oldVar = this.variables[variable.code];
            if (!oldVar) throw("Cannot find variable '" + variable.code + "'");
            if (oldVar.saveDetails && !variable.saveDetails) {
                await (await mongo.collection(variable.code + "_det")).drop();
            } else if (!oldVar.saveDetails && variable.saveDetails) {
                await mongo.collection(variable.code + "_det");
                await (await mongo.collection(variable.code + "_det")).createIndex({time:1});
            }        
            if (oldVar.temporality != variable.temporality) {
                await (await mongo.collection(variable.code)).deleteMany({});
            }
            await (await mongo.collection("z_variables")).updateOne({_id:variable.code}, {
                $set:{name:variable.name, temporality:variable.temporality, saveDetails:variable.saveDetails, options:variable.options}
            });
            await this.loadVariables();
        } catch(error) {
            throw error;
        }
    }
    async deleteVariable(code) {
        try {
            let v = this.variables[code];
            if (!v) throw "Can't find variable '" + code + "'";
            await (await mongo.collection("z_variables")).deleteOne({_id:code});
            try {
                await (await mongo.collection(code)).drop();
            } catch(error) {}
            try {
                await (await mongo.collection(code + "_det")).drop();
            } catch(error) {}
            await this.loadVariables();
            delete this.varIndexerPipes[code];
            return v;
        } catch(error) {
            throw error;
        }
    }
    async deletePeriod(variableCode, startTime, endTime, varData, details) {
        try {
            let v = this.variables[variableCode];
            if (!v) throw "No se encontró la variable '" + variableCode + "'";
            if (!varData && !details) throw "Must specify varData or details to delete (or both)";
            try {
                if (varData) {
                    await (await mongo.collection(variableCode)).deleteMany({time:{$gte:startTime, $lt:endTime}});
                }
                if (details && v.saveDetails) {
                    await (await mongo.collection(variableCode + "_det")).deleteMany({time:{$gte:startTime, $lt:endTime}});
                }
            } catch(error) {
                console.log(error);
                throw(error);
            }
            return v;
        } catch(error) {
            throw error;
        }
    }
    /*
    async addClassifier(variableCode, classifier) {
        let v = variables[variableCode];
        if (!v) throw("Variable '" + variableCode + "' no encontrada");
        let classifiers = v.classifiers?v.classifiers:[];
        let found = classifiers.findIndex(c => c.fieldName == classifier.fieldName);
        if (found >= 0) throw("El Campo '" + classifier.fieldName + "' ya existe en la variable");
        classifiers.push(classifier);
        await (await this.getCollection("z_variables")).updateOne({_id:variableCode}, {$set:{classifiers:classifiers}});
        await this.loadVariables();
        // update existing data with default value
        let setObject = {};
        setObject[classifier.fieldName] = classifier.defaultValue;
        let index = {};
        index[classifier.fieldName] = 1;
        await (await this.getCollection(variableCode)).createIndex(index);
        await (await this.getCollection(variableCode)).updateMany({}, {$set:setObject});
        if (varIndexerPipes[variableCode]) delete varIndexerPipes[variableCode];
        await this.recreateIndexes(v);
        return variables[variableCode];
    }
    async saveClassifier(variableCode, classifier) {
        let v = variables[variableCode];
        if (!v) throw("Variable '" + variableCode + "' no encontrada");
        let classifiers = v.classifiers?v.classifiers:[];
        let idx = classifiers.findIndex(c => c.fieldName == classifier.fieldName);
        if (idx < 0) throw("No se encontró el campo '" + classifier.fieldName + "' en los clasificadores de la variable");
        classifiers[idx].name = classifier.name;
        classifiers[idx].defaultValue = classifier.defaultValue;
        await (await this.getCollection("z_variables")).updateOne({_id:variableCode}, {$set:{classifiers:classifiers}});
        await this.loadVariables();        
        return variables[variableCode];
    }
    async deleteClassifier(variableCode, classifier) {
        let v = variables[variableCode];
        if (!v) throw("Variable '" + variableCode + "' no encontrada");
        let classifiers = v.classifiers?v.classifiers:[];
        let idx = classifiers.findIndex(c => c.fieldName == classifier.fieldName);
        if (idx < 0) throw("No se encontró el campo '" + classifier.fieldName + "' en los clasificadores de la variable");
        classifiers.splice(idx, 1);
        await (await this.getCollection("z_variables")).updateOne({_id:variableCode}, {$set:{classifiers:classifiers}});
        await this.loadVariables();
        // update existing data with removing field
        let unsetObject = {};
        unsetObject[classifier.fieldName] = "";
        await (await this.getCollection(variableCode)).updateMany({}, {$unset:unsetObject});
        if (varIndexerPipes[variableCode]) delete varIndexerPipes[variableCode];
        await this.recreateIndexes(v);
        return variables[variableCode];
    }
    */

    addClassifiersToIndexer(pipe, varOrDim, path) {
        varOrDim.classifiers.forEach(c => {
            let dim = dimensions.getDimension(c.dimensionCode);
            if (dim.classifiers.length) {
                let fieldPath = (path.length > 0?path + ".":"") + c.fieldName;
                let idxPath = (path.length > 0?path + ".":"") + c.fieldName + "_idx";
                var lookUpObject = {
                    from:           c.dimensionCode,
                    as:             idxPath,
                    localField:     fieldPath,
                    foreignField:   "_id"
                }
                pipe.push({$lookup:lookUpObject});
                pipe.push({$unwind:"$" + idxPath});
                let projectObject = {};
                projectObject[idxPath + "._id"] = 0;
                projectObject[idxPath + ".code"] = 0;
                projectObject[idxPath + ".name"] = 0;
                projectObject[idxPath + ".order"] = 0;
                pipe.push({$project:projectObject});
                this.addClassifiersToIndexer(pipe, dim, idxPath);
            }
        });
    }
    /*
    async importVariables(vars) {
        try {
            let colVars = await this.getCollection("z_variables");
            for (let i=0; i<vars.length; i++) {
                let v = vars[i];
                // Eliminar si existe
                await colVars.deleteOne({_id:v.code});
                await colVars.insertOne(v);
                await db.createCollection(v.code);
                await this.recreateIndexes(v);
            }
        } catch(error) {
            console.log(error);
            throw error;
        }
        this.loadVariables();
    }
    */
    getVarIndexerPipe(variableCode) {
        if (this.varIndexerPipes[variableCode]) return this.varIndexerPipes[variableCode];
        let pipe = [];
        var variable = this.variables[variableCode];
        this.addClassifiersToIndexer(pipe, variable, "");
        this.varIndexerPipes[variableCode] = pipe;
        return pipe;
    }
    fullIndex(variableCode) {
        let promise = new Promise(async (onOk, onError) => {
            try {
                let v = this.variables[variableCode];
                if (!v) throw "No se encontró la variable '" + variableCode + "'";
                await (await mongo.collection(variableCode)).dropIndexes(); 
                await (await mongo.collection("z_variables")).updateOne({_id:variableCode}, {$set:{indexing:true}});
                // Delete "_idx" collection if exists
                try {
                    await (await mongo.collection(variableCode + "_idx")).drop();
                } catch(err) {
                    console.log("Indexing collection. No previous _idx collection found");
                }
                // Delete old indexes from document
                let projectObject = {_id:1, time:1, n:1, value:1, min:1, max:1, sum2:1};
                v.classifiers.forEach(c => projectObject[c.fieldName] = 1);
                let pipe = [{$project:projectObject}];
                pipe = pipe.concat(this.getVarIndexerPipe(variableCode));
                pipe.push({$out:variableCode + "_idx"});
                console.log("Start Full index on " + variableCode + " with pipe", pipe);
                let cursor = await (await mongo.collection(variableCode)).aggregate(pipe);
                let rows = [];
                while (await cursor.hasNext()) {
                    var doc = await cursor.next();
                    rows.push(doc);
                }
                await cursor.close();
                await mongo.db.renameCollection(variableCode + "_idx", variableCode, {dropTarget:true});
                console.log("End of Full index on " + variableCode);
                await (await mongo.collection("z_variables")).updateOne({_id:variableCode}, {$set:{indexing:false}});
                await this.loadVariables(); 
                await this.recreateIndexes(v);
            } catch(error) {
                console.log("Error indexing variable", error);
            }
        });
        // Keep promise running and return
        return;
    }
    async getVarStatus(variableCode) {
        var html = "";
        var status = "ok";
        let v = await (await mongo.collection("z_variables")).findOne({_id:variableCode});
        if (v.indexing) {
            status = "idx";
            html += "<strong>La variable está siendo indexada</strong>";
        } else {
            html += "La variable está recibiendo datos";
        }
        html += "<hr />";
        let n = await (await mongo.collection(variableCode)).find({}).count();
        html += "<ul><li>Se encontraron " + n + " grupos acumulados (tiempo, clasificadores ...)</li>";
        if (v.saveDetails) {
            n = await (await mongo.collection(variableCode + "_det")).find({}).count();
            html += "<li>Se encontraron " + n + " registros de detalle de transacciones</li>";
        }
        html += "</ul>";
        return {code:status, html:html};
    }
    /*
    normalizeTime(temporality, time) {
        var d = new Date(time);
        d.setSeconds(0);
        d.setMilliseconds(0);
        switch(temporality) {
            case "5m":
                d.setMinutes(5 * parseInt(d.getMinutes() / 5));
                return d.getTime();
            case "15m":
                d.setMinutes(15 * parseInt(d.getMinutes() / 15));
                return d.getTime();
            case "30m":
                d.setMinutes(30 * parseInt(d.getMinutes() / 30));
                return d.getTime();
            case "1h":
                d.setMinutes(0);
                return d.getTime();
            case "6h":
                d.setMinutes(0);
                d.setHours(6 * parseInt(d.getHours() / 6));
                return d.getTime();
            case "12h":
                d.setMinutes(0);
                d.setHours(12 * parseInt(d.getHours() / 12));
                return d.getTime();
            case "1d":
                d.setMinutes(0);                
                d.setHours(0);
                return d.getTime();
            case "1M":
                d.setMinutes(0);                
                d.setHours(0);
                d.setDate(1);
                return d.getTime();
            case "3M":
                d.setMinutes(0);                
                d.setHours(0);
                d.setDate(1);
                d.setMonth(3 * parseInt(d.getMonth() / 3));
                return d.getTime();
            case "4M":
                d.setMinutes(0);                
                d.setHours(0);
                d.setDate(1);
                d.setMonth(4 * parseInt(d.getMonth() / 4));
                return d.getTime();
            case "6M":
                d.setMinutes(0);                
                d.setHours(0);
                d.setDate(1);
                d.setMonth(6 * parseInt(d.getMonth() / 6));
                return d.getTime();
            case "1y":
                d.setMinutes(0);                
                d.setHours(0);
                d.setDate(1);
                d.setMonth(0);
                return d.getTime();
            default:
                throw("Temporality '" + temporality + "' not handled");
        }
    }
    */
    normalizeTime(temporality, time) {
        var d = moment.tz(time, config.timeZone);
        d.seconds(0);
        d.milliseconds(0);
        switch(temporality) {
            case "5m":
                d.minutes(5 * parseInt(d.minutes() / 5));
                return d.valueOf();
            case "15m":
                d.minutes(15 * parseInt(d.minutes() / 15));
                return d.valueOf();
            case "30m":
                d.minutes(30 * parseInt(d.minutes() / 30));
                return d.valueOf();
            case "1h":
                d.minutes(0);
                return d.valueOf();
            case "6h":
                d.minutes(0);
                d.hours(6 * parseInt(d.hours() / 6));
                return d.valueOf();
            case "12h":
                d.minutes(0);
                d.hours(12 * parseInt(d.hours() / 12));
                return d.valueOf();
            case "1d":
                d.minutes(0);                
                d.hours(0);
                return d.valueOf();
            case "1M":
                d.minutes(0);                
                d.hours(0);
                d.date(1);
                return d.valueOf();
            case "3M":
                d.minutes(0);                
                d.hours(0);
                d.date(1);
                d.month(3 * parseInt(d.month() / 3));
                return d.valueOf();
            case "4M":
                d.minutes(0);                
                d.hours(0);
                d.date(1);
                d.month(4 * parseInt(d.month() / 4));
                return d.valueOf();
            case "6M":
                d.minutes(0);                
                d.hours(0);
                d.date(1);
                d.month(6 * parseInt(d.month() / 6));
                return d.valueOf();
            case "1y":
                d.minutes(0);                
                d.hours(0);
                d.date(1);
                d.month(0);
                return d.valueOf();
            default:
                throw("Temporality '" + temporality + "' not handled");
        }
    }
    async postData(varCode, time, value, data, options) {
        try {
            if (!time) time = (new Date()).getTime();
            let offset = moment.tz(time, config.timeZone).utcOffset();
            if (!options) options = {};
            let v = this.variables[varCode];
            if (!v) throw("Variable '" + varCode + "' not found");
            let filter = {time:this.normalizeTime(v.temporality, time)};
            if (!data) data = {};
            let dimValues = {};
            for (let i=0; i<v.classifiers.length; i++) {
                let c = v.classifiers[i];
                let dimValue = data[c.fieldName];
                if (!dimValue) dimValue = c.defaultValue;
                if (!options.noIntegrityCheck) {
                    await dimensions.findOrCreate(c.dimensionCode, dimValue);
                }
                filter[c.fieldName] = dimValue;
                dimValues[c.fieldName] = dimValue;
            }
            if (v.saveDetails) {
                await (await mongo.collection(varCode + "_det")).insertOne({time:time, value:value, data:data});
            }
            let varCollection = await mongo.collection(varCode);
            let doc = await varCollection.findOne(filter);
            if (doc) {
                let newValue = doc.value + value;
                let newN = doc.n + 1;
                let newSum2 = doc.sum2 + value * value;
                let newMin = value < doc.min?value:doc.min;
                let newMax = value > doc.max?value:doc.max;
                let setObject = {value:newValue, n:newN, sum2:newSum2, min:newMin, max:newMax};
                Object.keys(dimValues).forEach(fieldName => setObject[fieldName] = dimValues[fieldName]);
                await varCollection.updateOne({_id:doc._id}, {$set:setObject});
            } else {
                let newDoc = {time:filter.time, utcOffset:offset, n:1, value:value, sum2:value * value, min:value, max:value};
                Object.keys(dimValues).forEach(fieldName => newDoc[fieldName] = dimValues[fieldName]);
                let id = (await varCollection.insertOne(newDoc)).insertedId;
                let pipe = [{$match:{_id:id}}];
                pipe = pipe.concat(this.getVarIndexerPipe(varCode));
                if (pipe.length > 1) {
                    let [idxDoc] = await varCollection.aggregate(pipe).toArray();
                    if (!idxDoc) idxDoc = {};
                    let setObject = {};
                    v.classifiers.forEach(c => {
                        let d = dimensions.getDimension(c.dimensionCode);
                        if (d.classifiers.length) {
                            setObject[c.fieldName + "_idx"] = idxDoc[c.fieldName + "_idx"];
                        }
                    });
                    await varCollection.updateOne({_id:id}, {$set:setObject});
                }
            }
            return {};
        } catch(error) {
            console.log(error);
            throw("Error accumulating data:" + error.toString());            
        }
    }
    async postGrupoBatch(batch, options) { 
        try {
             for (var i=0; i<batch.length; i++) {
                 let v = batch[i];
                 await this.postData(v.variable, v.time, v.value, v.data, options);
             }
         } catch(error) {
             console.log(error);
             throw "Error processing grupo batch:" + error.toString();            
         }
     }
     async postDataBatch(batch, options) {
        try {
            // Separar en grupos por variable. Los grupos se procesan en paralelo y cada grupoo en serie
            let grupos = {};
            batch.forEach(v => {
                let g = grupos[v.variable];
                if (!g) {
                    g = [];
                    grupos[v.variable] = g;
                }
                g.push(v);
            })
            let promises = [];
            Object.values(grupos).forEach(g => promises.push(this.postGrupoBatch(g, options)));
            await Promise.all(promises);
            return {};
        } catch(error) {
            console.log(error);
            throw "Error processing batch:" + error.toString();            
        }
    }
    buildDimensionPipeFilterFrom(path, filterObject, matchObject) {
        Object.keys(filterObject).forEach(filterFieldName => {
            let newPath = path + (path.length?".":"") + filterFieldName;
            let v = filterObject[filterFieldName];
            if (v === null || typeof v == "string" || typeof v == "number") {
                matchObject[newPath] = v;
            } else if (Array.isArray(v)) {
                matchObject[newPath] = {$in:v};
            } else if (typeof v == "object") {
                this.buildDimensionPipeFilterFrom(newPath + "_idx", v, matchObject);
            } else throw "El tipo de filtro '" + (typeof v) + "' no está manejado";
        });
    }
    getDimensionPipeFilter(filter) {
        let matchObject = {};
        this.buildDimensionPipeFilterFrom("", filter, matchObject);
        if (!Object.keys(matchObject).length) return [];
        return [{$match:matchObject}];
    }
    buildGrouppingLocalTimeTransform(temporality) {
        let localTimeTransform = null;
        switch(temporality) {            
            case "15m":
                localTimeTransform = {
                    year:"$localTime.year",
                    month:"$localTime.month",
                    day:"$localTime.day",
                    hour:"$localTime.hour",
                    minute:{$multiply:[15, {$trunc:{$divide:["$localTime.minute", 15]}}]}
                }
                break;
            case "30m":
                localTimeTransform = {
                    year:"$localTime.year",
                    month:"$localTime.month",
                    day:"$localTime.day",
                    hour:"$localTime.hour",
                    minute:{$multiply:[30, {$trunc:{$divide:["$localTime.minute", 30]}}]}
                }
                break;
            case "1h":
                localTimeTransform = {
                    year:"$localTime.year",
                    month:"$localTime.month",
                    day:"$localTime.day",
                    hour:"$localTime.hour",
                    minute:{$literal:0}
                }
                break;
            case "6h":
                localTimeTransform = {
                    year:"$localTime.year",
                    month:"$localTime.month",
                    day:"$localTime.day",
                    hour:{$multiply:[6, {$trunc:{$divide:["$localTime.hour", 6]}}]},
                    minute:{$literal:0}
                }
                break;
            case "12h":
                localTimeTransform = {
                    year:"$localTime.year",
                    month:"$localTime.month",
                    day:"$localTime.day",
                    hour:{$multiply:[12, {$trunc:{$divide:["$localTime.hour", 12]}}]},
                    minute:{$literal:0}
                }
                break;
            case "1d":
                localTimeTransform = {
                    year:"$localTime.year",
                    month:"$localTime.month",
                    day:"$localTime.day",
                    hour:{$literal:0},
                    minute:{$literal:0}
                }
                break;
            case "1M":
                localTimeTransform = {
                    year:"$localTime.year",
                    month:"$localTime.month",
                    day:{$literal:1},
                    hour:{$literal:0},
                    minute:{$literal:0}
                }
                break;
            case "3M":
                localTimeTransform = {
                    year:"$localTime.year",
                    month:{$multiply:[3, {$trunc:{$divide:["$localTime.month", 3]}}]},
                    day:{$literal:1},
                    hour:{$literal:0},
                    minute:{$literal:0}
                }
                break;
            case "4M":
                localTimeTransform = {
                    year:"$localTime.year",
                    month:{$multiply:[4, {$trunc:{$divide:["$localTime.month", 4]}}]},
                    day:{$literal:1},
                    hour:{$literal:0},
                    minute:{$literal:0}
                }
                break;
            case "6M":
                localTimeTransform = {
                    year:"$localTime.year",
                    month:{$multiply:[6, {$trunc:{$divide:["$localTime.month", 6]}}]},
                    day:{$literal:1},
                    hour:{$literal:0},
                    minute:{$literal:0}
                }
                break;
            case "1y":
                localTimeTransform = {
                    year:"$localTime.year",
                    month:{$literal:1},
                    day:{$literal:1},
                    hour:{$literal:0},
                    minute:{$literal:0}
                }
                break;
        }
        return localTimeTransform;
    }
    getTimeSeriePipeline(varCode, finalTemporality, startTime, endTime, filter) {
        let timezone = config.timeZone;
        let v = this.variables[varCode];
        if (!v) throw("Variable '" + varCode + "' not found");
        let vTempLevel = temporalityLevel[v.temporality].level;
        if (!temporalityLevel[finalTemporality]) throw "Invalid temporality '" + finalTemporality + "'";
        let finalTempLevel = temporalityLevel[finalTemporality].level;
        if (finalTempLevel < vTempLevel) throw("Cannot group temporality '" + v.temporality + "' in temporality '" + finalTemporality + "'");

        let pipe = [];
        // Filter by time
        pipe.push({
            $match:{time:{$gte:startTime, $lt:endTime}}
        });
        // Filter by dimensions
        if (filter) {
            //pipe = pipe.concat(dimensions.getDimensionFilterPipeline(v, filter));
            pipe = pipe.concat(this.getDimensionPipeFilter(filter));
        }
        // Precalc time as date object
        pipe.push({
            $project:{
                asDate:{$add:[new Date(0), "$time", {$multiply:["$utcOffset", 60000]}]},
			    value:1, n:1, min:1, max:1, sum2:1
            }
        });
        // Build localTime
        pipe.push({
            $project:{
                localTime:{
                    year:{$year:{date:"$asDate"}},
                    month:{$month:{date:"$asDate"}},
                    day:{$dayOfMonth:{date:"$asDate"}},
                    hour:{$hour:{date:"$asDate"}},
                    minute:{$minute:{date:"$asDate"}}
                },
                value:1, n:1, min:1, max:1, sum2:1
            }
        });
        // Apply groupping rules
        if (finalTemporality != v.temporality) {
            let localTimeTransform = this.buildGrouppingLocalTimeTransform(finalTemporality);
            pipe.push({
                $project:{
                    localTime:localTimeTransform,
                    value:1, n:1, min:1, max:1, sum2:1
                }
            });
        }
        // Apply groupping
        pipe.push({
            $group:{
                _id:"$localTime",
                value:{$sum:"$value"},
                n:{$sum:"$n"},
                min:{$min:"$min"},
                max:{$max:"$max"},
                sum2:{$sum:"$sum2"}
            }
        });
        pipe.push({
            $project:{
                localTime:"$_id",
                value:1, n:1, min:1, max:1, sum2:1
            }
        });
        
        // Sort
        pipe.push({
            $sort:{"localTime.year":1, "localTime.month":1, "localTime.day":1, "localTime.hour":1, "localTime.minute":1}
        });
        return pipe;
    }  
    async getTimeSerie(varCode, temporality, startTime, endTime, filter) {
        //console.log("getTimeSerie:" + varCode + ", " + new Date(startTime) + " - " + new Date(endTime));
        let varCollection = await mongo.collection(varCode);
        let pipe = this.getTimeSeriePipeline(varCode, temporality, startTime, endTime, filter);
        let cursor = await varCollection.aggregate(pipe);
        let rows = [];
        while (await cursor.hasNext()) {
            var doc = await cursor.next();
            rows.push(doc);
        }
        await cursor.close();
        return rows;
    }  
    getPeriodResumePipeline(varCode, startTime, endTime, filter) {
        let v = this.variables[varCode];
        if (!v) throw("Variable '" + varCode + "' not found");
        let pipe = [];
        // Filter by time
        pipe.push({
            $match:{time:{$gte:startTime, $lt:endTime}}
        });
        // Filter by dimensions
        if (filter) {
            //pipe = pipe.concat(dimensions.getDimensionFilterPipeline(v, filter));
            pipe = pipe.concat(this.getDimensionPipeFilter(filter));
        }        
        // Group all
        pipe.push({
            $group:{
                _id:null,
                value:{$sum:"$value"},
                n:{$sum:"$n"},
                min:{$min:"$min"},
                max:{$max:"$max"},
                sum2:{$sum:"$sum2"}
            }
        });        
        return pipe;
    }
    async getPeriodResume(varCode, startTime, endTime, filter) {
        let varCollection = await mongo.collection(varCode);
        let pipe = this.getPeriodResumePipeline(varCode, startTime, endTime, filter);
        let cursor = await varCollection.aggregate(pipe);
        let resume = null;
        if (await cursor.hasNext()) {
            resume = await cursor.next();
        } else {
            resume = {n:0};
        }
        await cursor.close();
        return resume;
    }
    getFinalDimensionFromPath(varCode, path) {
        let pathElements = path.split(".");
        let varOrDim = this.variables[varCode];        
        pathElements.forEach(e => {
            let classifier = varOrDim.classifiers.find(cl => cl.fieldName == e);
            if (!classifier) throw "Ruta de filtro o dimension inválida:'" + path + "'. El campo '" + e + "' no pertenece al elemento";
            varOrDim = dimensions.getDimension(classifier.dimensionCode);
        });
        return varOrDim;
    }
    getDimSeriePipeline(varCode, startTime, endTime, filter, groupDimension) {
        let v = this.variables[varCode];
        if (!v) throw("Variable '" + varCode + "' not found");

        let pipe = [];
        // Filter by time
        pipe.push({
            $match:{time:{$gte:startTime, $lt:endTime}}
        });
        // Filter by dimensions
        if (filter) {
            pipe = pipe.concat(this.getDimensionPipeFilter(filter));
        }
        // Prepare grouping field from indexes
        let pathElements = groupDimension.split(".");
        // Add "_idx" to all elements except last
        let groupField = "";
        pathElements.forEach((e, i) => {
            groupField += (groupField.length?".":"") + e;
            if (i < (pathElements.length - 1)) groupField += "_idx";
        });
        pipe.push({
            $group:{
                _id:"$" + groupField,
                value:{$sum:"$value"},
                n:{$sum:"$n"},
                min:{$min:"$min"},
                max:{$max:"$max"},
                sum2:{$sum:"$sum2"}
            }
        });
        // lookup to dimension to get names and right order
        let dim = this.getFinalDimensionFromPath(varCode, groupDimension);
        pipe.push({
            $lookup:{
                from:dim.code,
                as:"dim",
                localField:"_id",
                foreignField:"_id"
            }
        });
        pipe.push({$unwind:"$dim"});
        pipe.push({$sort:{"dim.order":1}});
        // Remove extra fields from dimension
        pipe.push({$project:{value:1, n:1, min:1, max:1, sum2:1, "dim.code":1, "dim.name":1, "dim.order":1}});
        return pipe;
    }
    async getDimSerie(varCode, startTime, endTime, filter, groupDimension) {
        let varCollection = await mongo.collection(varCode);
        let pipe = this.getDimSeriePipeline(varCode, startTime, endTime, filter, groupDimension);
        let cursor = await varCollection.aggregate(pipe);
        let rows = [];
        while (await cursor.hasNext()) {
            var doc = await cursor.next();
            rows.push(doc);
        }
        await cursor.close();
        return rows;
    }
    getTimeDimTablePipeline(varCode, finalTemporality, startTime, endTime, groupDimension, filter) {
        let timezone = config.timeZone;
        let v = this.variables[varCode];
        if (!v) throw("Variable '" + varCode + "' not found");
        let vTempLevel = temporalityLevel[v.temporality].level;
        let finalTempLevel = temporalityLevel[finalTemporality].level;
        if (finalTempLevel < vTempLevel) throw("Cannot group temporality '" + v.temporality + "' in temporality '" + finalTemporality + "'");

        let pipe = [];
        // Filter by time
        pipe.push({
            $match:{time:{$gte:startTime, $lt:endTime}}
        });
        // Filter by dimensions
        if (filter) {
            pipe = pipe.concat(this.getDimensionPipeFilter(filter));
        }
        // Prepare grouping field from indexes
        let pathElements = groupDimension.split(".");
        // Add "_idx" to all elements except last
        let dimField = "";
        pathElements.forEach((e, i) => {
            dimField += (dimField.length?".":"") + e;
            if (i < (pathElements.length - 1)) dimField += "_idx";
        });
        // Precalc time as date object
        pipe.push({
            $project:{
                asDate:{$add:[new Date(0), "$time", {$multiply:["$utcOffset", 60000]}]},
                dim:"$" + dimField,
			    value:1, n:1, min:1, max:1, sum2:1
            }
        });
        // Build localTime
        pipe.push({
            $project:{
                localTime:{
                    year:{$year:{date:"$asDate"}},
                    month:{$month:{date:"$asDate"}},
                    day:{$dayOfMonth:{date:"$asDate"}},
                    hour:{$hour:{date:"$asDate"}},
                    minute:{$minute:{date:"$asDate"}}
                },
                value:1, n:1, min:1, max:1, sum2:1, dim:1
            }
        });
        // Apply groupping rules
        if (finalTemporality != v.temporality) {
            let localTimeTransform = this.buildGrouppingLocalTimeTransform(finalTemporality);
            pipe.push({
                $project:{
                    localTime:localTimeTransform,
                    value:1, n:1, min:1, max:1, sum2:1, dim:1
                }
            });
        }
        // Apply groupping
        pipe.push({
            $group:{
                _id:{time:"$localTime", dim:"$dim"},
                value:{$sum:"$value"},
                n:{$sum:"$n"},
                min:{$min:"$min"},
                max:{$max:"$max"},
                sum2:{$sum:"$sum2"}
            }
        });
        let dim = this.getFinalDimensionFromPath(varCode, groupDimension);
        pipe.push({
            $lookup:{
                from:dim.code,
                as:"dim",
                localField:"_id.dim",
                foreignField:"_id"
            }
        });
        pipe.push({$unwind:"$dim"});
        pipe.push({$sort:{"_id.time.year":1, "_id.time.month":1, "_id.time.day":1, "_id.time.hour":1, "_id.time.minute":1, "dim.order":1}});
        pipe.push({$project:{
            _id:0,
            localTime:"$_id.time",
            "dim.code":1, "dim.name":1, "dim.order":1, 
            value:1, n:1, min:1, max:1, sum2:1
        }})
        return pipe;
    }
    async getTimeDimTable(varCode, temporality, startTime, endTime, groupDimension, filter) {
        let varCollection = await mongo.collection(varCode);
        let pipe = this.getTimeDimTablePipeline(varCode, temporality, startTime, endTime, groupDimension, filter);
        let cursor = await varCollection.aggregate(pipe);
        let rows = [];
        while (await cursor.hasNext()) {
            var doc = await cursor.next();
            rows.push(doc);
        }
        await cursor.close();
        return rows;
    }
    getDimDimTablePipeline(varCode, startTime, endTime, hGroupDimension, vGroupDimension, filter) {
        let v = this.variables[varCode];
        if (!v) throw("Variable '" + varCode + "' not found");

        let pipe = [];
        // Filter by time
        pipe.push({
            $match:{time:{$gte:startTime, $lt:endTime}}
        });
        // Filter by dimensions
        if (filter) {
            pipe = pipe.concat(this.getDimensionPipeFilter(filter));
        }
        // Prepare grouping field from indexes
        let pathElements = hGroupDimension.split(".");
        // Add "_idx" to all elements except last
        let hDimField = "";
        pathElements.forEach((e, i) => {
            hDimField += (hDimField.length?".":"") + e;
            if (i < (pathElements.length - 1)) hDimField += "_idx";
        });
        pathElements = vGroupDimension.split(".");
        let vDimField = "";
        pathElements.forEach((e, i) => {
            vDimField += (vDimField.length?".":"") + e;
            if (i < (pathElements.length - 1)) vDimField += "_idx";
        });
        // Project group dims
        pipe.push({
            $project:{
                hDim:"$" + hDimField,
                vDim:"$" + vDimField,
			    value:1, n:1, min:1, max:1, sum2:1
            }
        });
        // Apply groupping
        pipe.push({
            $group:{
                _id:{hDim:"$hDim", vDim:"$vDim"},
                value:{$sum:"$value"},
                n:{$sum:"$n"},
                min:{$min:"$min"},
                max:{$max:"$max"},
                sum2:{$sum:"$sum2"}
            }
        });
        // Lookup dimensions
        let hDim = this.getFinalDimensionFromPath(varCode, hGroupDimension);
        pipe.push({
            $lookup:{
                from:hDim.code,
                as:"hDim",
                localField:"_id.hDim",
                foreignField:"_id"
            }
        });
        pipe.push({$unwind:"$hDim"});
        let vDim = this.getFinalDimensionFromPath(varCode, vGroupDimension);
        pipe.push({
            $lookup:{
                from:vDim.code,
                as:"vDim",
                localField:"_id.vDim",
                foreignField:"_id"
            }
        });
        pipe.push({$unwind:"$vDim"});

        pipe.push({$project:{
            _id:0,
            "hDim.code":1, "hDim.name":1, "hDim.order":1, 
            "vDim.code":1, "vDim.name":1, "vDim.order":1, 
            value:1, n:1, min:1, max:1, sum2:1
        }})
        return pipe;
    }
    async getDimDimTable(varCode, startTime, endTime, hGroupDimension, vGroupDimension, filter) {
        let varCollection = await mongo.collection(varCode);
        let pipe = this.getDimDimTablePipeline(varCode, startTime, endTime, hGroupDimension, vGroupDimension, filter);
        let cursor = await varCollection.aggregate(pipe);
        let rows = [];
        while (await cursor.hasNext()) {
            var doc = await cursor.next();
            rows.push(doc);
        }
        await cursor.close();
        return rows;
    }  
}

module.exports = Variables.instance;