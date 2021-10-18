class WTimeSerie extends ZDialog {
    onThis_init(options) {
        this.options = options;
        this.edTipoSerie.setRows([{
            code:"line", name:"Gráfico de Líneas"
        }, {
            code:"columns", name:"Gráfico de Columnas"
        }, {
            code:"triangles", name:"Triángulos"
        }, {
            code:"area", name:"Gráfico de Área"
        }, {
            code:"3d-columns", name:"Columnas 3D"
        }, {
            code:"3d-cylinders", name:"Cilindros 3D"
        }], options.serieType)
        this.edZoomTiempo.checked = options.zoomTiempo;
    }    

    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onCmdOk_click() {
        this.close({
            serieType: this.edTipoSerie.value,
            zoomTiempo: this.edZoomTiempo.checked
        });
    }
}
ZVC.export(WTimeSerie);