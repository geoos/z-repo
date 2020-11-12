const config = require("../lib/Config").config;
const mongo = require("./MongoDB");

class Security {
    static instance() {
        if (Security.singleton) return Security.singleton;
        Security.singleton = new Security();
        return Security.singleton;
    }

    constructor() {
        this.masterToken = config.masterToken;
    }

    async checkPrivilege(token, privilege) {
        const secError = "Not authorized";
        try {
            if (!token) throw secError;
            if (token == this.masterToken) return;
            if (privilege == "master") {
                if (token != this.masterToken) throw secError;
                else return;
            }
            let t = config.tokens[token];
            if (!t) throw secError;
            if (!t[privilege]) throw secError;
        } catch(error) {
            throw error;
        }
    }

    /*
    async getTokens(masterToken) {
        try {
            await this.checkPrivilege(masterToken, "master");
            return Object.keys(config.tokens);
            let rows = await (await mongo.collection("z_tokens")).find().toArray();
            return rows.map(r => ({token:r._id, name:r.name, admin:r.admin, post:r.post, query:r.query}));
        } catch(error) {
            throw error;
        }
    }
    async getToken(masterToken, token) {
        try {
            await this.checkPrivilege(masterToken, "master");
            let r = await (await mongo.collection("z_tokens")).find({_id:token}).toArray();
            if (!r) return null;
            return {token:r._id, name:r.name, admin:r.admin, post:r.post, query:r.query};
        } catch(error) {
            throw error;
        }
    }
    async addToken(masterToken, token, name, admin, post, query) {
        try {
            await this.checkPrivilege(masterToken, "master");
            admin = admin?true:false;
            post = post?true:false;
            query = query?true:false;            
            await (await mongo.collection("z_tokens")).insertOne({_id:token, name:name, admin:admin, post:post, query:query})
            return {};
        } catch(error) {
            throw error;
        }
    }
    async deleteToken(masterToken, token) {
        try {
            await this.checkPrivilege(masterToken, "master");
            await (await mongo.collection("z_tokens")).deletOne({_id:token})
            return {};
        } catch(error) {
            throw error;
        }
    }
    */
}

module.exports = Security.instance();