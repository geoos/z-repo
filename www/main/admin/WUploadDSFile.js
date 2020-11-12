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
        if (this.dsImport.askForTime) {
            this.edTime.format = getFormatForTemporality(this.ds.temporality);
            this.edTime.value = normalizeTimeForTemporality(this.ds.temporality, moment.tz());
        } else {
            this.edTime.hide();
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

    async onCmdOk_click() {
        this.importing = true;
        this.edTime.disable();
        this.cmdOk.disable();
        this.workingMessage.show();
        this.workingText.text = "Importando Archivo ...";
        if (this.dsImport.askForTime) {
            let time = normalizeTimeForTemporality(this.ds.temporality, this.edTime.value).valueOf();
            this.rows.forEach(r => r.time = time)
        }        
        this.progress.show();
        let batch = [], i=0;
        while (i < this.rows.length && this.importing) {
            batch.push(this.rows[i]);
            if (batch.length == this.dsImport.batchSize || i == (this.rows.length - 1)) {
                let w = parseInt(100 * (i + 1) / this.rows.length) + "%";
                this.progressBar.view.style.width = w;  
                this.progressBar.text = "" + (i+1) + "/" + this.rows.length;
                try {
                    await zPost("importDSBatch.zrepo", {dsCode:this.ds.code, rows:batch});
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