class WDimSerie extends ZDialog {
    onThis_init(options) {
        this.options = options;
        this.ruta = this.options.ruta;
        this.tmpQuery = new MinZQuery(window.zRepoClient, options.variable);
        if (!this.ruta) {
            this.edRuta.value = "[Sin Selección]";
        } else {
            this.edRuta.value = this.ruta;
        }

        this.edTipoSerie.setRows([{
            code:"bars", name:"Barras"
        }, {
            code:"3d-bars", name:"Barras 3D"
        }, {
            code:"columns", name:"Columnas"
        }, {
            code:"3d-columns", name:"Columnas 3D"
        }], options.serieType)
    }    

    onCmdSeleccionaRuta_click() {
        this.showDialog("common/WMinZRoute", {consulta:this.tmpQuery, ruta:this.ruta}, newRuta => {
            this.ruta = newRuta;
            this.edRuta.value = this.ruta;
        })
    }
    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onCmdOk_click() {
        this.close({ruta: this.ruta, serieType:this.edTipoSerie.value});
    }
}
ZVC.export(WDimSerie);