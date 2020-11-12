const fs = require("fs");
const HJSON = require("hjson");
const logs = require("./Logs");

class Config {
    static get instance() {
        if (Config.singleton) return Config.singleton;
        Config.singleton = new Config();
        return Config.singleton;
    }
    constructor() {
        this.mongoUrl = process.env.MONGO_URL;
        this.mongoDatabase = process.env.MONGO_DATABASE || "zrepo";
        this.masterToken = process.env.MASTER_TOKEN || "zrepo-master-token";
        this.httpPort = process.env.HTTP_PORT || 8096;
        this.timeZone = process.env.TIME_ZONE || "America/Santiago";

        this.logLevel = process.env.LOG_LEVEL || "info";
        this.logRetain = process.env.LOG_RETAIN || 30;

        this.lastConfigTime = null;        
    }

    async init() {
        try {
            this.config = await this.getChangedConfig();
            setInterval(async _ => {
                let c = await this.getChangedConfig();
                if (c) {
                    logs.info("Configuration reloaded")
                }
            }, 5000)
        } catch (error) {
            throw error;
        }
    }

    modifiedTime(path) {
        return new Promise((resolve, reject) => {
            fs.stat(path, (err, stats) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(stats.mtime.getTime());
            })
        })
    }

    readFile(path) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, (err, data) => {
                if (err) reject(err);
                else resolve(data.toString());
            })
        })
    }

    async getChangedConfig() {
        try {
            let mtime = await this.modifiedTime("/home/config/zrepo.hjson");
            if (mtime != this.lastConfigTime) {
                this.lastConfigTime = mtime;
                let st = await this.readFile("/home/config/zrepo.hjson");
                try {
                    let c = HJSON.parse(st);
                    this.buildConfig(c);
                    await (require("../dataSets/DataSets").init())
                    await (require("../minz/Variables").init())
                    return this.config;
                } catch(error) {
                    console.error(error);
                    logs.error("Cannot parse config file at '/home/config/zrepo.hjson': " + error.toString())
                }
            }
            return null;
        } catch(error) {
            throw error;
        }
    }

    buildConfig(c) {
        this.adminLogin = c.adminLogin;
        this.adminPassword = c.adminPassword;
        if (c.dimensions) {
            Object.keys(c.dimensions).forEach(dimCode => c.dimensions[dimCode].code = dimCode);
        }
        if (c.variables) {
            Object.keys(c.variables).forEach(varCode => c.variables[varCode].code = varCode);
        }
        this.config = c;
    }
}

module.exports = Config.instance;