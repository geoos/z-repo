class WHeatMap extends ZDialog {
    onThis_init(options) {
        this.options = options;
        this.rutaH = this.options.rutaH;
        this.rutaV = this.options.rutaV;
        this.tmpQuery = new MinZQuery(window.zRepoClient, options.variable);
        if (!this.rutaH) {
            this.edRutaH.value = "[Sin Selección]";
        } else {
            this.edRutaH.value = this.rutaH;
        }
        if (!this.rutaV) {
            this.edRutaV.value = "[Sin Selección]";
        } else {
            this.edRutaV.value = this.rutaV;
        }
    }    

    onCmdSeleccionaRutaH_click() {
        this.showDialog("common/WMinZRoute", {consulta:this.tmpQuery, ruta:this.rutaH}, newRuta => {
            this.rutaH = newRuta;
            this.edRutaH.value = this.rutaH;
        })
    }
    onCmdSeleccionaRutaV_click() {
        this.showDialog("common/WMinZRoute", {consulta:this.tmpQuery, ruta:this.rutaV}, newRuta => {
            this.rutaV = newRuta;
            this.edRutaV.value = this.rutaV;
        })
    }
    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onCmdOk_click() {
        this.close({rutaH: this.rutaH, rutaV: this.rutaV});
    }
}
ZVC.export(WHeatMap);