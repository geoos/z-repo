const ZModule = require("./z-server").ZModule;
const config = require("./Config");
const dimensions = require("./../minz/Dimensions");
const dataSets = require("../dataSets/DataSets");

class Portal extends ZModule {
    static get instance() {
        if (Portal.singleton) return Portal.singleton;
        Portal.singleton = new Portal();
        return Portal.singleton;
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
            throw "Usuario o Contraseña Inválidos";
        } catch (error) {
            throw error;
        }
    }

    async getConfig() {
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
}

module.exports = Portal.instance;