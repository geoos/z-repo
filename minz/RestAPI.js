const dimensions = require("./Dimensions");
const variables = require("./Variables");
const security = require("./Security");
const config = require("../lib/Config");
const moment = require("moment-timezone");

class RestAPI {
    constructor() {
    }
    static get instance() {
        if (!RestAPI.singleton) RestAPI.singleton = new RestAPI();
        return RestAPI.singleton;
    }

    getAuth(req) {
        let auth = req.get("Authorization");
        if (auth) {
            if (auth.startsWith("Bearer ")) {
                auth = auth.substr(7);
            } 
        } else {
            auth = req.query.token;
            if (!auth && req.body) auth = req.body.token;
        }
        return auth;
    }

    register(app) {
        // Security
        app.get("/tokens", async (req, res) => {
            try {
                res.setHeader('Content-Type', 'application/json');
                let rows = await security.getTokens(this.getAuth(req));
                res.send(JSON.stringify(rows));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        });
        app.get("/tokens/:token", async (req, res) => {
            try {
                res.setHeader('Content-Type', 'application/json');
                let t = await security.getToken(this.getAuth(req), req.params.token);
                res.send(JSON.stringify(t));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        });
        app.post("/tokens", async (req, res) => {
            try {
                let token = req.body.token;
                let name = req.body.name;
                let admin = req.body.admin;
                let post = req.body.post;
                let query = req.body.query;
                if (!token || !name || admin === undefined || post === undefined || query === undefined) throw "Invalid format {token:string, name:string, admin:bool, post:bool, query:bool}"
                if (!admin && !post && !query) throw "Invalid authorization token";
                res.setHeader('Content-Type', 'application/json');
                let t = await security.addToken(this.getAuth(req), token, name, admin, post, query);
                res.send(JSON.stringify(t));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        });
        app.delete("/tokens/:token", async (req, res) => {
            try {
                res.setHeader('Content-Type', 'application/json');
                await security.deleteToken(this.getAuth(req), req.params.token);
                res.send(JSON.stringify({}));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        });

        // Dimensions
        app.get("/dim/dimensions", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-read");
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(await dimensions.getDimensions(req.query.filter)));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        });
        app.get("/dim/:code", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-read");
                res.setHeader('Content-Type', 'application/json');
                let d = await dimensions.getDimension(req.params.code);
                if (!d) res.status(404).send("Not Found");
                else res.send(JSON.stringify(d));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        });


        // Dimension Rows
        app.post("/dim/:code/rows", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-write-dim");
                res.setHeader('Content-Type', 'application/json');
                let row = await dimensions.addOrUpdateRow(req.params.code, req.body);
                res.send(JSON.stringify(row));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        })
        app.delete("/dim/:dimCode/rows/:rowCode", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-write-dim");
                res.setHeader('Content-Type', 'application/json');
                let row = await dimensions.deleteRow(req.params.dimCode, req.params.rowCode);
                res.send(JSON.stringify(row));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        })
        app.get("/dim/:dimCode/rows/:rowCode", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-read");
                res.setHeader('Content-Type', 'application/json');
                let row = await dimensions.getRow(req.params.dimCode, req.params.rowCode);
                res.send(JSON.stringify(row));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        })
        app.get("/dim/:dimCode/rows", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-read");
                res.setHeader('Content-Type', 'application/json');
                let filter = req.query.filter?decodeURIComponent(req.query.filter):undefined;
                if (filter) {
                    try {
                        filter = JSON.parse(filter);
                    } catch(error) {
                        throw "Cannot decode filter parameter as JSON object: '" + filter + "'";
                    }
                }
                let textFilter = req.query.textFilter?decodeURIComponent(req.query.textFilter):undefined;
                let startRow = req.query.startRow, nRows = req.query.nRows;
                if (startRow !== undefined && nRows !== undefined) {
                    startRow = parseInt(startRow);
                    nRows = parseInt(nRows);
                    if (isNaN(startRow) || isNaN(nRows) || startRow < 0 || nRows < 0) throw "Invalid start/nRows";
                } else {
                    startRow = undefined;
                    nRows = undefined;
                }
                let includeNames = req.query.includeNames;
                includeNames = includeNames && includeNames.toLowerCase() == "true";
                let count = req.query.count;
                if (count && count == "true") {
                    let n = await dimensions.getRowsCount(req.params.dimCode, textFilter, filter);
                    res.status(200).send(JSON.stringify({n:n})).end();
                    return;
                }
                let rows;
                if (includeNames) {
                    rows = await dimensions.getRowsWithClassifiersNames(req.params.dimCode, textFilter, filter, startRow, nRows);
                } else {
                    rows = await dimensions.getRows(req.params.dimCode, textFilter, filter, startRow, nRows);
                }
                res.status(200).send(JSON.stringify(rows)).end();
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        })

        // Variables
        app.get("/var/variables", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-read");
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(await variables.getVariables(req.query.filter)));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        });
        app.get("/var/:code", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-read");
                res.setHeader('Content-Type', 'application/json');
                let d = await variables.getVariable(req.params.code);
                if (!d) res.status(404).send("Not Found");
                else res.send(JSON.stringify(d));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        });
        app.delete("/data/:code/period", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-write-var");
                let startTime = parseInt(req.query.startTime);
                let endTime = parseInt(req.query.endTime);
                if (isNaN(startTime) || isNaN(endTime)) throw "Must indicate startTime and endTime";
                let varData = req.query.varData?true:false;
                let details = req.query.details?true:false;
                res.setHeader('Content-Type', 'application/json');
                let v = await variables.deletePeriod(req.params.code, startTime, endTime, varData, details);
                res.send(JSON.stringify(v));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        })
        app.post("/data/:code", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-write-var");
                res.setHeader('Content-Type', 'application/json');
                let d = await variables.postData(req.params.code, req.body.time, req.body.value, req.body.data, req.body.options);
                res.send(JSON.stringify(d));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        })
        app.post("/batch", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-write-var");
                res.setHeader('Content-Type', 'application/json');
                let d = await variables.postDataBatch(req.body.batch, req.body.options);
                res.send(JSON.stringify(d));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        })

        // Queries
        app.get("/data/:code/time-serie", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-read");
                let temporality = req.query.temporality;
                if (!temporality) throw "Must provide temporality";
                let startTime = req.query.startTime;
                let endTime = req.query.endTime;
                if (!isNaN(parseInt(startTime)) && startTime.indexOf("-") < 0) startTime = parseInt(startTime);
                if (!isNaN(parseInt(endTime)) && endTime.indexOf("-") < 0) endTime = parseInt(endTime);
                if (!startTime || !endTime) throw "Must provide startTime and endTime";
                if (typeof startTime == "string") startTime = moment.tz(startTime, config.timeZone).valueOf();
                if (typeof endTime == "string") endTime = moment.tz(endTime, config.timeZone).valueOf();
                let filter = req.query.filter || "{}";
                filter = JSON.parse(filter);
                res.setHeader('Content-Type', 'application/json');
                let rows = await variables.getTimeSerie(req.params.code, req.query.temporality, startTime, endTime, filter);
                res.send(JSON.stringify(rows));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        })
        app.get("/data/:code/period-summary", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-read");
                let startTime = req.query.startTime;
                let endTime = req.query.endTime;
                if (!isNaN(parseInt(startTime)) && startTime.indexOf("-") < 0) startTime = parseInt(startTime);
                if (!isNaN(parseInt(endTime)) && endTime.indexOf("-") < 0) endTime = parseInt(endTime);
                if (!startTime || !endTime) throw "Must provide startTime and endTime";
                if (typeof startTime == "string") startTime = moment.tz(startTime, config.timeZone).valueOf();
                if (typeof endTime == "string") endTime = moment.tz(endTime, config.timeZone).valueOf();
                let filter = req.query.filter || "{}";
                filter = JSON.parse(filter);
                res.setHeader('Content-Type', 'application/json');
                let rows = await variables.getPeriodResume(req.params.code, startTime, endTime, filter);
                res.send(JSON.stringify(rows));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        })
        app.get("/data/:code/dim-serie", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-read");
                let startTime = req.query.startTime;
                let endTime = req.query.endTime;
                if (!isNaN(parseInt(startTime)) && startTime.indexOf("-") < 0) startTime = parseInt(startTime);
                if (!isNaN(parseInt(endTime)) && endTime.indexOf("-") < 0) endTime = parseInt(endTime);
                if (!startTime || !endTime) throw "Must provide startTime and endTime";
                if (typeof startTime == "string") startTime = moment.tz(startTime, config.timeZone).valueOf();
                if (typeof endTime == "string") endTime = moment.tz(endTime, config.timeZone).valueOf();

                let filter = req.query.filter || "{}";
                filter = JSON.parse(filter);
                let groupDimension = req.query.groupDimension;
                if (!groupDimension) throw "Must provide groupDimension";
                res.setHeader('Content-Type', 'application/json');
                let rows = await variables.getDimSerie(req.params.code, startTime, endTime, filter, groupDimension);
                res.send(JSON.stringify(rows));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        })
        app.get("/data/:code/time-dim", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-read");
                let startTime = req.query.startTime;
                let endTime = req.query.endTime;
                if (!isNaN(parseInt(startTime)) && startTime.indexOf("-") < 0) startTime = parseInt(startTime);
                if (!isNaN(parseInt(endTime)) && endTime.indexOf("-") < 0) endTime = parseInt(endTime);
                if (!startTime || !endTime) throw "Must provide startTime and endTime";
                if (typeof startTime == "string") startTime = moment.tz(startTime, config.timeZone).valueOf();
                if (typeof endTime == "string") endTime = moment.tz(endTime, config.timeZone).valueOf();
                let filter = req.query.filter || "{}";
                filter = JSON.parse(filter);
                let groupDimension = req.query.groupDimension;
                if (!groupDimension) throw "Must provide groupDimension";
                let temporality = req.query.temporality;
                if (!temporality) throw "Must provide temporality";
                res.setHeader('Content-Type', 'application/json');
                let rows = await variables.getTimeDimTable(req.params.code, temporality, startTime, endTime, groupDimension, filter);
                res.send(JSON.stringify(rows));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        })
        app.get("/data/:code/dim-dim", async (req, res) => {
            try {
                await security.checkPrivilege(this.getAuth(req), "minz-read");
                let startTime = req.query.startTime;
                let endTime = req.query.endTime;
                if (!isNaN(parseInt(startTime)) && startTime.indexOf("-") < 0) startTime = parseInt(startTime);
                if (!isNaN(parseInt(endTime)) && endTime.indexOf("-") < 0) endTime = parseInt(endTime);
                if (!startTime || !endTime) throw "Must provide startTime and endTime";
                if (typeof startTime == "string") startTime = moment.tz(startTime, config.timeZone).valueOf();
                if (typeof endTime == "string") endTime = moment.tz(endTime, config.timeZone).valueOf();
                let filter = req.query.filter || "{}";
                filter = JSON.parse(filter);
                let vGroupDimension = req.query.vGroupDimension;
                if (!vGroupDimension) throw "Must provide vGroupDimension";
                let hGroupDimension = req.query.hGroupDimension;
                if (!hGroupDimension) throw "Must provide hGroupDimension";
                res.setHeader('Content-Type', 'application/json');
                let rows = await variables.getDimDimTable(req.params.code, startTime, endTime, hGroupDimension, vGroupDimension, filter);
                res.send(JSON.stringify(rows));
            } catch(error) {
                if (typeof error == "string") {
                    res.status(400).send(error.toString())
                } else {
                    console.log(error);
                    res.status(500).send("Internal Error")
                }
            }
        })
    }
}

module.exports = RestAPI.instance;