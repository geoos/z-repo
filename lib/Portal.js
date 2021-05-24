const ZModule = require("./z-server").ZModule;
const config = require("./Config");
const dimensions = require("./../minz/Dimensions");
const dataSets = require("../dataSets/DataSets");
const mongo = require("../minz/MongoDB");
const bcrypt = require('bcryptjs');
const uuid = require('uuid');
const nodemailer = require("nodemailer");

class Portal extends ZModule {
    static get instance() {
        if (Portal.singleton) return Portal.singleton;
        Portal.singleton = new Portal();
        return Portal.singleton;
    }

    _encript(pwd) {
        return new Promise((onOk, onError) => {
            bcrypt.hash(pwd, 8, (err, hash) => {
                if (err) onError(err);
                else onOk(hash);
            });
        });
    }
    _compareWithEncripted(pwd, hash) {
        return bcrypt.compare(pwd, hash);
    }

    async login(email, pwd) {
        try {
            if (email == config.adminLogin && pwd == config.adminPassword) {
                return {
                    token: "admin",
                    email: email,
                    name: "Admin"
                }
            } 
            let col = await mongo.collection("users");
            let u = await col.findOne({_id:email});
            if (!u) throw "Usuario o Contraseña Inválidos";
            const pwdValida = await this._compareWithEncripted(pwd, u.pwd);
            if (!pwdValida) throw "Usuario o Contraseña Inválidos";
            col = await mongo.collection("user_sesion");
            let s = await col.findOne({email:email});
            if (s) return {token:s._id, email:email, name:u.name}
            s = {_id:uuid.v4(), email:email, loginTime:Date.now()}
            await col.insertOne(s);
            return s;
        } catch (error) {
            throw error;
        }
    }

    async getUsers() {
        try {
            let col = await mongo.collection("users");
            let rows = await col.find().sort({email:1}).toArray();
            return rows.map(r => ({
                email:r._id, name:r.name
            }))
        } catch (error) {
            throw error;
        }
    }
    async addUser(user) {
        try {
            let col = await mongo.collection("users");
            let doc = {_id:user.email, name:user.email};
            await col.insertOne(doc);
        } catch (error) {
            throw error;
        }
    }
    async saveUser(user) {
        try {
            let col = await mongo.collection("users");
            let doc = {$set:{name:user.name}};
            await col.updateOne({_id:user.email}, doc);
        } catch (error) {
            throw error;
        }
    }
    async deleteUser(email) {
        try {
            let col = await mongo.collection("users");            
            await col.deleteOne({_id:email});
        } catch (error) {
            throw error;
        }
    }

    async enviaCodigoCambioPwd(email) {
        try {
            let chars = "0123456789";
            let codigo = "";
            while(codigo.length < 6) {
                codigo += chars.substr(parseInt(Math.random() * chars.length), 1);
            }
            let html = `
                <p>
                    Se ha solicitado un código para cambio de contraseña para ZRepo para esta dirección de correo.
                    Para completar el cambio de contraseña, por favor pegue el siguiente código en el sistema:
                </p>
                <h4>${codigo}</h4>
                <hr />
                <p><small>Este es un correo automático, por favor no responder</small></p>
            `;
            await this._sendMail(email, "Código para Cambio de Contraseña", html);
            let updateDoc = {$set:{creationCode:codigo}};
            let col = await mongo.collection("users");
            await col.updateOne({_id:email}, updateDoc);
        } catch (error) {
            throw error;
        }
    }

    _sendMail(to, subject, html) {
        try {
            let parameters = config.config.smtp;;
            if (!this._transport) {
                if (!parameters) throw "No se ha configurado el servidor SMTP";
                this._transport = nodemailer.createTransport(parameters);
            }
            return new Promise((resolve, reject) => {
                let message = {
                    from: parameters.from,
                    subject: subject,
                    to: to,
                    text: null,
                    html: html
                }
                this._transport.sendMail(message, (err, info) => {
                    if (err) reject(err);
                    resolve(info);
                });
            });
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async cambiarPwd(email, codigo, pwd) {
        try {
            let col = await mongo.collection("users");
            let doc = await col.findOne({_id:email});
            if (!doc) throw "Usuario inválido";
            if (doc.creationCode != codigo) throw "El código de creación de contraseña es inválido";
            let pwdHash = await this._encript(pwd);
            await col.updateOne({_id:email}, {$set:{creationCode:null, pwd:pwdHash}});
        } catch (error) {
            throw error;
        }
    }

    getConfig() {
        try {
            return config.config;
        } catch (error) {
            throw error;
        }
    }

    // Dimensions
    getRowsCount(dimCode, textFilter, filter) {
        return dimensions.getRowsCount(dimCode, textFilter, filter);
    }
    getRows(dimCode, textFilter, filter, startRow, nRows) {
        return dimensions.getRows(dimCode, textFilter, filter, startRow, nRows);
    }
    getRow(dimCode, code) {
        return dimensions.getRow(dimCode, code);
    }
    getRowWithDependencies(dimCode, code) {
        return dimensions.getRowWithDependencies(dimCode, code);
    }
    addDimRow(dimCode, row) {
        return dimensions.addRow(dimCode, row);
    }
    saveDimRow(dimCode, row) {
        return dimensions.saveRow(dimCode, row);
    }
    deleteDimRow(dimCode, code) {
        return dimensions.deleteRow(dimCode, code);
    }
    syncDimension(dimCode) {
        return dimensions.syncDimension(dimCode);
    }
    importDimensionRows(dimCode, rows) {
        return dimensions.importRows(dimCode, rows);
    }

    // DataSets
    getDSRowsCount(dsCode, fromTime, toTime, filter) {
        return dataSets.getRowsCount(dsCode, fromTime, toTime, filter);
    }
    getDSRows(startRow, nRows, dsCode, fromTime, toTime, filter) {
        return dataSets.getRows(startRow, nRows, dsCode, fromTime, toTime, filter);
    }
    importDSBatch(dsCode, rows) {
        return dataSets.importBatch(dsCode, rows);
    }
    importDSRow(dsCode, row) {
        return dataSets.importRow(dsCode, row);
    }
    syncDataSet(dsCode, importIndex) {
        return dataSets.syncDataSet(dsCode, importIndex);
    }
}

module.exports = Portal.instance;