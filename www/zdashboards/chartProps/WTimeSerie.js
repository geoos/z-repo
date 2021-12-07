class WTimeSerie extends ZDialog {
    onThis_init(options) {
        this.options = options;
        this.edTipoSerie.setRows([{
            code:"line", name:"Gráfico de Líneas"
        }, {
            code:"smoothed-line", name:"Gráfico de Líneas Suavizadas"
        }, {
            code:"columns", name:"Gráfico de Columnas"
        }, {
            code:"curved-columns", name:"Columnas Curvas"
        }, {
            code:"area", name:"Gráfico de Área"
        }, {
            code:"smoothed-area", name:"Gráfico de Área Suavizada"
        }, {
            code:"rounded-columns", name:"Columnas Redondeadas"
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