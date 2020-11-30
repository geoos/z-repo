'use strict';

const mongo = require("./MongoDB");

class Dimensions {
    static get instance() {
        if (!Dimensions.singleton) Dimensions.singleton = new Dimensions();
        return Dimensions.singleton;
    }
    get dimensions() {
        return require("./../lib/Config").config.dimensions;
    }

    getDimensions(filter) {
        let f = filter?filter.toLowerCase():null;
        return Object.keys(this.dimensions)
            .map(code => this.dimensions[code])
            .filter(d => (!f || d.code.toLowerCase().indexOf(f) >= 0 || d.name.toLowerCase().indexOf(f) >= 0));
    }
    getDimension(dimensionCode) {
        return this.dimensions[dimensionCode];
    }

    // Dimension Data
    async getNextOrder(dimensionCode) {
        try {
            let [lastRow] = await (await mongo.collection(dimensionCode)).find({}).sort({order:-1}).limit(1).toArray();        
            return lastRow?lastRow.order+1:1;
        } catch(error) {
            throw error;
        }
    }
    async addRow(dimensionCode, row) {
        try {
            let d = this.dimensions[dimensionCode];
            if (!d) throw("Can' find dimension '" + dimensionCode + "'");
            // Test classifiers and set to defaultValue if no provided
            for (let i=0; i<d.classifiers.length; i++) {
                let c = d.classifiers[i];
                if (row[c.fieldName] === undefined) {
                    row[c.fieldName] = c.defaultValue;
                } else {
                    await this.createDefaultRowIfNotExists(c.dimensionCode, row[c.fieldName]);
                }
            };
            row._id = row.code;
            row.order = await this.getNextOrder(dimensionCode);
            try {
                await (await mongo.collection(dimensionCode)).insertOne(row);
            } catch(error) {
                console.log(error);
                if (error.code == 11000) {
                    throw("El código ingresado para " + d.name + " ya existe");
                } else {
                    throw("Error agregando fila:" + error.toString());
                }
            }
            return row;
        } catch(error) {
            throw error;
        }
    }
    async saveRow(dimensionCode, row) {
        try {
            let d = this.dimensions[dimensionCode];
            if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
            // Update classifiers
            let usedFields = {_id:true, code:true, name:true, order:true}
            let setObject = {name:row.name};
            for (let i=0; i<d.classifiers.length; i++) {
                let c = d.classifiers[i];
                let v = row[c.fieldName];
                if (v === undefined) {
                    v = c.defaultValue;
                    row[c.fieldName] = v;
                } else {
                    await this.createDefaultRowIfNotExists(c.dimensionCode, v);
                }
                setObject[c.fieldName] = v;
                usedFields[c.fieldName] = true;
            };
            // Set extra data
            for (let fieldName in row) {
                if (!usedFields[fieldName]) setObject[fieldName] = row[fieldName];
            }
            await (await mongo.collection(dimensionCode)).updateOne({_id:row.code}, {$set:setObject});
            return row;
        } catch(error) {
            throw error;
        }
    }
    async deleteRow(dimensionCode, code) {
        try {
            let row = await this.getRow(dimensionCode, code);
            if (!row) throw "No se encontró la fila";
            await (await mongo.collection(dimensionCode)).deleteOne({_id:code});
            return row;
        } catch(error) {
            throw error;
        }
    }
    async getRow(dimensionCode, code) {
        try {
            let d = this.dimensions[dimensionCode];
            if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
            let row = await (await mongo.collection(dimensionCode)).findOne({_id:code});
            return row;
        } catch(error) {
            throw error;
        }
    }
    async addOrUpdateRow(dimensionCode, row) {
        try {
            let d = this.dimensions[dimensionCode];
            if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
            for (let i=0; i<d.classifiers.length; i++) {
                let c = d.classifiers[i];
                if (row[c.fieldName] === undefined) {
                    row[c.fieldName] = c.defaultValue;
                } else {
                    await this.createDefaultRowIfNotExists(c.dimensionCode, row[c.fieldName]);
                }
            };
            row._id = row.code;
            row.order = await this.getNextOrder(dimensionCode);
            let setObject = JSON.parse(JSON.stringify(row));
            try {
                let col = await mongo.collection(dimensionCode);
                await col.updateOne({_id:row._id}, {$set:setObject}, {upsert:true})
            } catch(error) {
                throw("Cannot add or update row to dimension '" + dimensionCode + "':" + error.toString());
            }
            return row;
        } catch(error) {
            throw error;
        }
    }
    async createDefaultRowIfNotExists(dimensionCode, code) {
        try {
            let d = this.dimensions[dimensionCode];
            if (!d) throw("Can't find dimension '" + dimensionCode + "'");
            let found = await (await mongo.collection(dimensionCode)).findOne({_id:code});
            if (found) return;
            let doc = {_id:code, code:code, name:d.name + " " + code}
            d.classifiers.forEach(c => {
                doc[c.fieldName] = c.defaultValue;
            });
            doc.order = await this.getNextOrder(dimensionCode);
            try {
                await (await mongo.collection(dimensionCode)).insertOne(doc);
            } catch(error) {
                throw("Cannot create default row in dimension '" + dimensionCode + "':" + error.toString());
            }
        } catch(error) {
            throw error;
        }
    }


    // Query filtering
    appendDimensionFilterLookup(c, filterObject) {
        let pipe = [];
        let letObject = {};
        letObject["id_" + c.fieldName] = "$" + c.fieldName;
        let lookupObject = {
            from:c.dimensionCode,
            as:c.fieldName + "_tmp",
            let:letObject,
            pipeline:[
                {$match:{$expr:{$eq:["$_id", "$$id_" + c.fieldName]}}}
            ]
        }
        // Apply filter for each classifier in filterObject
        var d = this.dimensions[c.dimensionCode];
        if (!d) throw "No se encontró la dimensión '" + c.dimensionCode + "'";
        let matchObject2 = {};

        Object.keys(filterObject).forEach(filterFieldName => {
            var v2 = filterObject[filterFieldName];
            if (v2 === null || typeof v2 == "string" || typeof v2 == "number") {
                matchObject2[filterFieldName] = v2;
            } else {
                var c2 = d.classifiers.find(c => c.fieldName == filterFieldName);
                if (!c2) throw "Nombre de campo '" + filterFieldName + "' inválido en filtro de dimensión";
                lookupObject.pipeline = lookupObject.pipeline.concat(this.appendDimensionFilterLookup(c2, v2));
            }
        });
        if (Object.keys(matchObject2).length) lookupObject.pipeline.push({$match:matchObject2});

        pipe.push({$lookup:lookupObject});
        pipe.push({$unwind:"$" + c.fieldName + "_tmp"}); // Remove row if array is empty
        
        let projectObject = {};
        projectObject[c.fieldName + "_tmp"] = 0;
        pipe.push({$project:projectObject});
        
        return pipe;
    }
    getDimensionFilterPipeline(varOrDimension, filter) {
        let pipe = [];
        if (!filter) return pipe;
        let matchObject = {};
        let lookupfilters = [];

        if (Array.isArray(filter)) {
            return [{$match:{code:{$in:filter}}}];
        }
        Object.keys(filter).forEach(filterFieldName => {
            let v = filter[filterFieldName];
            if (v === null || typeof v == "string" || typeof v == "number") {
                matchObject[filterFieldName] = v;
            } else if (Array.isArray(v)) {
                matchObject[filterFieldName] = {$in:v};
            } else if (typeof v == "object") {
                // {comuna:{provincia:{region:"05"}, tipoComuna:"rural"}}
                var c = varOrDimension.classifiers.find(c => c.fieldName == filterFieldName);
                if (!c) throw "Nombre de campo '" + filterFieldName + "' inválido en filtro de dimensión";
                lookupfilters = lookupfilters.concat(this.appendDimensionFilterLookup(c, v));
            }
        });
        // Add first match filter to discard rows faster
        if (Object.keys(matchObject).length) pipe.push({$match:matchObject});
        if (lookupfilters.length) pipe = pipe.concat(lookupfilters);
        return pipe;
    }
    getRowsFilterPipeline(dimensionCode, textFilter, filter) {
        let d = this.dimensions[dimensionCode];
        if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
        let pipe = [];
        if (textFilter && textFilter.length) {
            pipe.push({
                $match:{
                    $or:[
                        {code:{$regex:textFilter, $options:"i"}},
                        {name:{$regex:textFilter, $options:"i"}}
                    ]
                }
            })
        }
        if (filter) pipe = pipe.concat(this.getDimensionFilterPipeline(d, filter));
        return pipe;
    }
    getRowsDimensionsPipeline(dimensionCode) {
        let d = this.dimensions[dimensionCode];
        if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
        let pipe = [];
        d.classifiers.forEach(c => {
            let addFieldsObject = {};
            addFieldsObject[c.fieldName + "_name"] = "$" + c.fieldName + "_row.name";
            let removeFieldObject = {};
            removeFieldObject[c.fieldName + "_row"] = 0;
            pipe.push({
                $lookup:{
                    from:c.dimensionCode,
                    localField:c.fieldName,
                    foreignField:"_id",
                    as:c.fieldName + "_row"
                }
            }, {
                $unwind:{path:"$" + c.fieldName + "_row", preserveNullAndEmptyArrays:true}
            }, {
                $addFields:addFieldsObject
            }, {
                $project:removeFieldObject
            });
        });
        return pipe;
    }
    
    async getRowsCount(dimensionCode, textFilter, filter) {
        let pipe = this.getRowsFilterPipeline(dimensionCode, textFilter, filter);
        pipe.push({$count:"n"});
        let cursor = await (await mongo.collection(dimensionCode)).aggregate(pipe);
        let n = 0;
        if (await cursor.hasNext()) {
            let doc = await cursor.next();
            n = doc.n;
        }
        await cursor.close();
        return n;
    }
    async getRows(dimensionCode, textFilter, filter, startRow, nRows) {
        let pipe = this.getRowsFilterPipeline(dimensionCode, textFilter, filter);
        pipe.push({$sort:{order:1}});
        if (startRow !== undefined && nRows !== undefined) {
            pipe.push({$skip:startRow});
            pipe.push({$limit:nRows});
        }
        let cursor = await (await mongo.collection(dimensionCode)).aggregate(pipe);
        let rows = [];
        while(await cursor.hasNext()) {
            rows.push(await cursor.next());
        }
        await cursor.close();
        return rows;
    }
    async getAllRows(dimensionCode) {
        try {
            let col = await mongo.collection(dimensionCode);
             let rows = await col.find().toArray();
             return rows;
        } catch (error) {
            throw error;
        }
    }
    async getRowsWithClassifiersNames(dimensionCode, textFilter, filter, startRow, nRows) {
        let pipe = this.getRowsFilterPipeline(dimensionCode, textFilter, filter);
        pipe = pipe.concat(this.getRowsDimensionsPipeline(dimensionCode));
        pipe.push({$sort:{order:1}});
        if (startRow !== undefined && nRows) {
            pipe.push({$skip:startRow});
            pipe.push({$limit:nRows});
        }

        let cursor = await (await mongo.collection(dimensionCode)).aggregate(pipe);
        let rows = [];
        while(await cursor.hasNext()) {
            rows.push(await cursor.next());
        }
        await cursor.close();
        return rows;
    }    
    analizeClassifiers(dimensionCode) {
        // Count elements for each classifier (GUI can use search dialog or combo box)
        return new Promise((onOk, onError) => {
            let d =dimensions[dimensionCode];
            if (!d) onError("No se encontró la dimensión '" + dimensionCode + "'");
            let promises = [];
            d.classifiers.forEach(c => {
                promises.push(new Promise(async (onOk2, onError2) => {
                    try {
                        let n = await (await this.getCollection(c.dimensionCode)).find().count();
                        onOk2(n);
                    } catch(error) {
                        onError2(error);
                    }                    
                }));
            });
            Promise.all(promises)
                .then(ns => onOk(ns))
                .catch(error => onError(error));
        });
    }

    /*
    async moveRowUpInView(dimensionCode, textFilter, filter, rowCode) {
        let [originalRow] = await (await this.getCollection(dimensionCode)).find({_id:rowCode}).toArray();
        let pipe = this.getRowsFilterPipeline(dimensionCode, textFilter, filter);
        pipe.push({
            $match:{order:{$lt:originalRow.order}}
        })
        pipe.push({$sort:{order:-1}});
        pipe.push({$limit:1});

        let [row] = await (await this.getCollection(dimensionCode)).aggregate(pipe).toArray();
        if (!row) return;
        let swap = row.order;
        await (await this.getCollection(dimensionCode)).updateOne({_id:row._id}, {$set:{order:originalRow.order}});
        await (await this.getCollection(dimensionCode)).updateOne({_id:originalRow._id}, {$set:{order:swap}});        
    }
    async moveRowDownInView(dimensionCode, textFilter, filter, rowCode) {
        let [originalRow] = await (await this.getCollection(dimensionCode)).find({_id:rowCode}).toArray();
        let pipe = this.getRowsFilterPipeline(dimensionCode, textFilter, filter);
        pipe.push({
            $match:{order:{$gt:originalRow.order}}
        })
        pipe.push({$sort:{order:1}});
        pipe.push({$limit:1});

        let [row] = await (await this.getCollection(dimensionCode)).aggregate(pipe).toArray();
        if (!row) return;
        let swap = row.order;
        await (await this.getCollection(dimensionCode)).updateOne({_id:row._id}, {$set:{order:originalRow.order}});
        await (await this.getCollection(dimensionCode)).updateOne({_id:originalRow._id}, {$set:{order:swap}});        
    }
    */
    async findOrCreate(dimensionCode, id) {
        let d = this.dimensions[dimensionCode];
        if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
        let doc = await (await mongo.collection(dimensionCode)).findOne({_id:id});
        if (!doc) {
            doc = {_id:id, code:id, name:d.name + " " + id};
            d.classifiers.forEach(c => doc[c.fieldName] = c.defaultValue);
            doc.order = await this.getNextOrder(dimensionCode);
            try {
                await (await mongo.collection(dimensionCode)).insertOne(doc);
            } catch(error) {
                // Ignorar .. en modo batch se procesan en paralelo
            }
        }
    }
    /*
    async importRows(dimensionCode, rows) {
        let d =dimensions[dimensionCode];
        if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
        let col = await this.getCollection(dimensionCode);
        for (let i=0; i<rows.length; i++) {
            let row = rows[i];
            // Check classifiers integrity
            for (let j=0; j<d.classifiers.length; j++) {
                let c = d.classifiers[j];
                await this.findOrCreate(c.dimensionCode, row[c.fieldName]);
            }
            let doc = await col.findOne({_id:row.code});
            if (doc) {
                // update record
                let setObject = {name:row.name};
                d.classifiers.forEach(c => setObject[c.fieldName] = row[c.fieldName]);
                await col.updateOne({_id:row.code}, {$set:setObject});
            } else {
                doc = {_id:row.code, code:row.code, name:row.name};                
                d.classifiers.forEach(c => doc[c.fieldName] = row[c.fieldName]);
                doc.order = await this.getNextOrder(dimensionCode);
                await col.insertOne(doc);
            }
        };
    }
    */
    async getRowWithDependencies(dimensionCode, code) {
        let d =this.dimensions[dimensionCode];
        if (!d) throw("No se encontró la dimensión '" + dimensionCode + "'");
        let doc = await (await mongo.collection(dimensionCode)).findOne({_id:code});
        if (doc) {
            for (let i=0; i<d.classifiers.length; i++) {
                let c = d.classifiers[i];
                let subRow = await this.getRowWithDependencies(c.dimensionCode, doc[c.fieldName]);
                doc[c.fieldName] = subRow?subRow:null;
            }
        }
        return doc;
    }  

    async syncDimension(dimensionCode) {
        try {
            let dim = this.dimensions[dimensionCode];
            if (!dim) throw "No se encontró la dimensión '" + dimensionCode + "'";
            if (!dim.sync) throw "No hay información de sincronización para la dimensión";
            if (dim.sync.type == "geojson") await this.doSyncGeoJson(dim);
        } catch (error) {
            throw error;
        }
    }

    async importRows(dimensionCode, rows) {
        try {
            let dim = this.dimensions[dimensionCode];
            if (!dim) throw "No se encontró la dimensión '" + dimensionCode + "'";
            for (let row of rows) {
                await this.addOrUpdateRow(dimensionCode, row);
            }
        } catch (error) {
            throw error;
        }
    }

    async doSyncGeoJson(dim) {
        try {
            let url = dim.sync.url;
            const http = url.startsWith("http:")?require("http"):require("https");
            let geojson = await (new Promise((resolve, reject) => {
                try {
                    http.get(dim.sync.url, res => {
                        if (res.statusCode != 200) {
                            reject("[" + res.statusCode + "] " + res.statusMessage);
                            return;
                        }
                        let st = "";
                        res.on("data", chunk => st += chunk);
                        res.on("end", _ => resolve(st));
                        res.on("error", error => {
                            console.error("Error obteniendo geojson remoto", error);
                            reject(error)
                        })
                    }).on("error", error => {
                        console.error("Error obteniendo geojson remoto", error);
                        reject("Error obteniendo archivo remoto:" + error.toString())
                    })
                } catch(error) {
                    console.error("Error obteniendo geojson remoto", error);
                    reject(error)

                }
            }))
            geojson = JSON.parse(geojson);
            let propsMap = Object.keys(dim.sync.fields).reduce((map, fieldName) => {
                map[dim.sync.fields[fieldName]] = fieldName;
                return map;
            }, {})
            let rows = [];
            for (let feature of geojson.geoJson.features) {
                let row = {}
                for (let prop in feature.properties) {
                    let fieldName = propsMap[prop]
                    if (fieldName) row[fieldName] = feature.properties[prop];
                }
                rows.push(row)
            }
            if (dim.sync.sort) {
                let direction = dim.sync.sort.direction || "asc";
                rows.sort((r1, r2) => {
                    let v1 = r1[dim.sync.sort.field];
                    let v2 = r2[dim.sync.sort.field];
                    if (direction == "asc") return v1 > v2 ? 1:-1;
                    else return v2 > v1 ? 1:-1;

                })
            }
            for (let row of rows) {
                await this.addOrUpdateRow(dim.code, row)
            }
        } catch(error) {
            throw error;
        }
    }
}

module.exports = Dimensions.instance;