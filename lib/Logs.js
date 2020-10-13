const moment = require("moment-timezone");
const fs = require("fs");

class Logs {
    static get instance() {
        if (Logs.singleton) return Logs.singleton;
        Logs.singleton = new Logs("zrepo-");
        return Logs.singleton;
    }
    constructor(prefix) {
        this.prefix = prefix;
        this.callDeleterDaemon();
    }

    append(path, txt) {
        return new Promise((resolve, reject) => {
            fs.appendFile(path, txt, err => {
                if (err) reject(err);
                else resolve();
            })
        });
    }
    async writeLog(level, txt) {
        try {
            const config = require("./Config");
            let now = moment.tz(config.timeZone);
            let path = "/home/log/" + this.prefix + now.format("YYYY-MM-DD") + ".log";
            let hhmm = now.format("HH:mm:ss");
            await this.append(path, hhmm + " [" + level + "] " + txt + "\n");
        } catch(error) {
            throw error;
        }
    }

    debug(txt) {
        const config = require("./Config");
        if (config.logLevel != "debug") return;
        this.writeLog("debug", txt);
    }
    info(txt) {
        const config = require("./Config");
        if (config.logLevel != "debug" && config.logLevel != "info") return;
        this.writeLog("info", txt);
    }
    warn(txt) {
        const config = require("./Config");
        if (config.logLevel != "debug" && config.logLevel != "info" && config.logLevel != "warning") return;
        this.writeLog("warn", txt);
    }
    error(txt) {
        this.writeLog("error", txt);
    }

    callDeleterDaemon(ms = 600000) {
        if (this.timerDeleterDaemon) clearTimeout(this.timerDeleterDaemon);
        this.timerDeleterDaemon = setTimeout(_ => {
            this.timerDeleterDaemon = null;
            this.deleterDaemon();
        }, ms)
    }

    deleterDaemon() {
        const config = require("./Config");
        try {
            if (!config.logRetain) return;
            let treshold = moment.tz(config.timeZone).startOf("day").subtract(config.logRetain, "days");
            let path = "/home/log"
             let files = fs.readdirSync(path);
             files.forEach(f => {
                 if (f.startsWith(this.prefix)) {
                    let name = f.substr(this.prefix.length);
                    name = name.substr(0, name.length - 4);
                    let time = moment.tz(name, config.timeZone);
                    if (time.isBefore(treshold)) {
                        try {
                            fs.unlinkSync(path + "/" + f);
                        } catch(error) {
                            console.log("Error deleting old log:" + error);
                        }
                    }
                 }
             })
        } catch(error) {
            console.error(error);
        } finally {
            this.callDeleterDaemon();
        }
    }
}

module.exports = Logs.instance;