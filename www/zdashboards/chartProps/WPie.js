class WPie extends ZDialog {
    onThis_init(options) {
        this.options = options;
        this.ruta = this.options.ruta;
        this.tmpQuery = new MinZQuery(window.zRepoClient, options.variable);
        if (!this.ruta) {
            this.edRuta.value = "[Sin Selección]";
        } else {
            this.edRuta.value = this.ruta;
        }
        this.edLeyendas.setRows([{
            code:"none", name:"[No mostrar Leyendas]"
        }, {
            code:"inline", name:"En el Gráfico"
        }, {
            code:"right", name:"A la derecha"
        }, {
            code:"left", name:"A la izquierda"
        }, {
            code:"top", name:"Arriba"
        }, {
            code:"bottom", name:"Abajo"
        }], options.leyendas);

        this.edTipoPie.setRows([{
            code:"2d", name:"Pie 2D"
        }, {
            code:"dona-2d", name:"Dona 2D"
        }, {
            code:"dona-gradiente", name:"Dona con Gradiente"
        }, {
            code:"3d", name:"Pie 3D"
        }, {
            code:"dona-3d", name:"Dona 3D"
        }], options.tipoTorta)
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
        this.close({ruta: this.ruta, leyendas:this.edLeyendas.value, tipoTorta:this.edTipoPie.value});
    }
}
ZVC.export(WPie);