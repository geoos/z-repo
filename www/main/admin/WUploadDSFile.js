class WUploadDSFile extends ZDialog {
    onThis_init(options) {
        this.ds = options.ds;
        this.dsImport = options.dsImport;
        this.title.text = this.ds.name;
        this.subtitle.text = this.dsImport.label;
        this.errorMessage.hide();
        this.workingMessage.hide();
        this.progress.hide();
        this.cmdOk.hide();        
        if (this.ds.temporality == "none") {
            this.timeRow.hide();
        } else {
            let timeZone = moment.tz.guess();
            if (this.dsImport.askForTime) {
                this.edTime.format = getFormatForTemporality(this.ds.temporality);
                this.edTime.value = normalizeTimeForTemporality(this.ds.temporality, moment.tz(timeZone));
            } else {
                this.edTime.hide();
            }
            this.edTimeZone.setRows(moment.tz.names().map(n => ({name:n})), timeZone);
        }
    }

    onEdTimeZone_change() {
        if (this.dsImport.askForTime) {
            let tz = this.edTimeZone.value;
            let t = this.edTime.value.valueOf();
            this.edTime.value = moment.tz(t, tz);
        }
    }

    onCmdCloseWindow_click() {
        this.cancelImport()
    }
    onCmdCancel_click() {
        this.cancelImport()
    }

    cancelImport() {
        this.cmdCloseWindow.hide();
        this.cmdCancel.disable();
        if (!this.importing) {
            this.cancel();

            return;
        }
        this.importing = false;
        this.workingMessage.text = "Cancelando ...";
    }

    async onEdFile_change() {
        this.fileRow.hide();
        let file = this.edFile.view.files[0];
        try {
            let p = file.name.lastIndexOf(".");    
            if (p < 0) throw "No se puede determinar el tipo del archivo por su extensión: " + file.name;
            let type = file.name.substr(p+1).toLowerCase();
            if (["csv", "json", "geojson"].indexOf(type) < 0) throw "Archivo de extensión '" + type + "' no manejado";
            this.workingMessage.show();
            this.workingText.text = "Analizando Archivo ...";
            switch(type) {
                case "csv": await this.readCSV(); break;
                case "json": await this.readJSON(); break;
                case "geojson": await this.readGEOJSON(); break;
            }
            if (!this.rows.length) throw "No se encontraron filas para importar"
            if (this.dsImport.mapFrom.constants) {
                for (let row of this.rows) {
                    for (let cName in this.dsImport.mapFrom.constants) {
                        row[cName] = this.dsImport.mapFrom.constants[cName];
                    }                    
                }
            }
            console.log("rows", this.rows);
            this.cmdOk.find("#lblNRows").textContent = this.rows.length;
            this.cmdOk.show();
            this.workingMessage.hide();
        } catch(error) {
            this.workingMessage.hide();
            this.errorMessage.show();
            this.errorText.text = error.toString();
        }
    }

    readGEOJSON() {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {                
                let geojson = JSON.parse(e.target.result)
                if (!geojson.features) throw "Formato GeoJSON inválido. No hay 'features'";
                this.rows = geojson.features.reduce((list, feature) => {
                    let props = feature.properties;
                    let row = {}
                    this.ds.columns.forEach(col => {
                        let colCode = col.code, srcCode = col.code;
                        if (this.dsImport.mapFrom && this.dsImport.mapFrom[colCode]) {
                            srcCode = this.dsImport.mapFrom[colCode];
                        }
                        row[colCode] = props[srcCode]
                    })
                    list.push(row);
                    return list;
                }, [])
                resolve();
            }
            reader.onerror = error => reject(error);
            reader.readAsText(this.edFile.view.files[0]);
        })
    }

    readJSON() {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {    
                try {            
                    let json = JSON.parse(e.target.result)
                    // Buscar atributo arreglo en la raiz
                    let root = null;
                    for (let keyName in json) {
                        let v = json[keyName];
                        if (Array.isArray(v)) {
                            if (root) throw "Se encontraron dos atributos 'array' en la raíz del json. Sólo debe haber uno."
                            root = keyName;
                        }                    
                    }
                    if (!root) throw "No se encontró ningún atributo raíz de tipo 'array'";
                    this.rows = json[root].reduce((list, srcRow) => {
                        console.log("srcRow", srcRow);
                        let row = {}
                        this.ds.columns.forEach(col => {
                            let colCode = col.code, srcCode = col.code;
                            if (this.dsImport.mapFrom && this.dsImport.mapFrom[colCode]) {
                                srcCode = this.dsImport.mapFrom[colCode];
                            }
                            row[colCode] = srcRow[srcCode]
                            console.log(srcCode + " => " + colCode)
                        })
                        list.push(row);
                        return list;
                    }, [])
                } catch(error) {
                    reject(error);
                }
                resolve();
            }
            reader.onerror = error => reject(error);
            reader.readAsText(this.edFile.view.files[0]);
        })
    }

    readCSV() {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {    
                try { 
                    this.rows = [];
                    let lines = e.target.result.split("\n");      
                    let separator = this.dsImport.separator || ",";      
                    let timeZone = this.edTimeZone.value;
                    let dsCols = this.ds.columns.reduce((map, col) => {
                        map[col.code] = col;
                        return map;
                    }, {});
                    for (let i=0; i<lines.length; i++) {
                        if (this.dsImport.skipRows && i < this.dsImport.skipRows) continue;
                        let row = {}, line = lines[i];
                        let fields = line.split(separator);
                        if (fields.length < 2) continue;
                        Object.keys(this.dsImport.mapFrom).forEach(colName => {
                            let m = this.dsImport.mapFrom[colName];
                            if (typeof m == "number") {
                                let v = fields[m];
                                if (v.startsWith('"') && v.endsWith('"') || v.startsWith("'") && v.endsWith("'")) {
                                    v = v.substr(1, v.length - 2);
                                }
                                if (dsCols[colName]) {
                                    let dType = dsCols[colName].type;
                                    if (dType == "number") {
                                        v = parseFloat(v);
                                        if (!isNaN(v)) row[colName] = v;
                                    } else {
                                        row[colName] = v;
                                    }
                                } else {
                                    row[colName] = v;
                                }
                            } else if (typeof m == "object") {
                                if (m.prepend) {
                                    let v = m.prepend + fields[m.columnIndex];
                                    row[colName] = v;
                                } else if (m.timeFormat) {
                                    let v = fields[m.columnIndex];
                                    if (v.startsWith('"') && v.endsWith('"') || v.startsWith("'") && v.endsWith("'")) {
                                        v = v.substr(1, v.length - 2);
                                    }
                                    let mom = moment.tz(v, m.timeFormat, timeZone);
                                    row[colName] = mom.valueOf();
                                }
                            }
                        });
                        this.rows.push(row);
                    }
                } catch(error) {
                    reject(error);
                }
                resolve();
            }
            reader.onerror = error => reject(error);
            reader.readAsText(this.edFile.view.files[0]);
        })
    }

    async onCmdOk_click() {
        this.importing = true;
        this.edTime.disable();
        this.cmdOk.disable();
        this.workingMessage.show();
        this.workingText.text = "Importando Archivo ...";
        if (this.dsImport.askForTime) {
            let normalizedTime = normalizeTimeForTemporality(this.ds.temporality, this.edTime.value);
            let time = normalizedTime.valueOf();
            this.rows.forEach(r => r.time = time)
        }        
        this.progress.show();
        let batch = [], i=0, batchSize = this.dsImport.batchSize || 1;
        while (i < this.rows.length && this.importing) {
            batch.push(this.rows[i]);
            if (batch.length == batchSize || i == (this.rows.length - 1)) {
                let w = parseInt(100 * (i + 1) / this.rows.length) + "%";
                this.progressBar.view.style.width = w;  
                this.progressBar.text = "" + (i+1) + "/" + this.rows.length;
                try {
                    if (this.dsImport.batchSize) {
                        await zPost("importDSBatch.zrepo", {dsCode:this.ds.code, rows:batch});
                    } else {
                        await zPost("importDS.zrepo", {dsCode:this.ds.code, rows:batch[0]});
                    }
                } catch(error) {
                    this.workingMessage.hide();
                    this.errorText.text = error.toString();
                    this.errorMessage.show();
                    this.progress.hide();
                    this.importing = false;
                }
                batch= [];
            }
            i++;
        }
        this.close();
    }
}
ZVC.export(WUploadDSFile);