class WImportDimensionRows extends ZDialog {
    onThis_init(options) {
        this.dimension = options.dimension;
        this.subtitle.text = this.dimension.name;
        this.errorMessage.hide();
        this.workingMessage.hide();
        this.cmdOk.hide();        
    }    

    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onEdFile_change() {
        this.fileRow.hide();
        let file = this.edFile.view.files[0];
        try {
            let p = file.name.lastIndexOf(".");    
            if (p < 0) throw "No se puede determinar el tipo del archivo por su extensión: " + file.name;
            let type = file.name.substr(p+1).toLowerCase();
            if (["json"].indexOf(type) < 0) throw "Archivo de extensión '" + type + "' no manejado. Cargue un archivo json generado con la opción 'exportar'";
            this.workingMessage.show();
            this.workingText.text = "Analizando Archivo ...";
            await this.readJSON();
            if (!this.rows.length) throw "No se encontraron filas para importar"
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

    readJSON() {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {    
                try {            
                    let json = JSON.parse(e.target.result)
                    if (!Array.isArray(json)) throw "El archivo importado debe corresponder a un array json de objetos";
                    this.rows = json;
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
        this.cmdOk.disable();
        this.workingMessage.show();
        this.workingText.text = "Importando Archivo ...";
        try {
            await zPost("importDimensionRows.zrepo", {dimCode:this.dimension.code, rows:this.rows});
            this.close();
        } catch(error) {
            console.error(error);
            this.workingMessage.hide();
            this.errorText.text = error.toString();
            this.errorMessage.show();
            this.importing = false;
        }
    }
}
ZVC.export(WImportDimensionRows);