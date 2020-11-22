const config = require("../lib/Config");
const mongo = require("./MongoDB");

class Security {
    static instance() {
        if (Security.singleton) return Security.singleton;
        Security.singleton = new Security();
        return Security.singleton;
    }

    constructor() {        
    }

    get masterToken() {return config.masterToken}    

    async checkPrivilege(token, privilege) {
        const secError = "Not authorized";
        try {
            if (!token) throw secError;
            if (token == this.masterToken) return;
            if (privilege == "master") {
                if (token != this.masterToken) throw secError;
                else return;
            }
            let t = config.config.tokens[token];
            if (!t) throw secError;
            if (!t[privilege]) throw secError;
        } catch(error) {
            throw error;
        }
    }
}

module.exports = Security.instance();