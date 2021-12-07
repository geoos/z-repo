const queryCharts = {
    "empty":"zdashboards/EmptyChart",
    "time-serie":"zdashboards/TimeSerie",
    "pie":"zdashboards/Pie",
    "dim-serie":"zdashboards/DimSerie",
    "heatmap":"zdashboards/HeatMap",
    "gauge":"zdashboards/Gauge",
    "time-dim":"zdashboards/TimeDim",
    "labels":"zdashboards/Labels"
}

class CustomQuery extends ZCustomController {    
    get chart() {return this.chartLoader.content}
    get variable() {return this.edVariable.selectedRow}

    async onThis_init() {
        //am4core.options.autoDispose = true;
        this.edVariable.setGroups(window.zrepo.variablesTree, "name", "variables");
        this.edQuery.setRows([{
            code:"time-serie", name:"Serie de Tiempo"
        }, {
            code:"pie", name:"Gráfico de Torta"
        }, {
            code:"dim-serie", name:"Barras por Dimensiones"
        }, {
            code:"heatmap", name:"Heat Map"
        }, {
            code:"gauge", name:"Gauge"
        }, {
            code:"time-dim", name:"Serie Temporal Dimensiones"
        }, {
            code:"labels", name:"Resumen (Etiquetas)"
        }])        
        this.edAcumulador.setRows([{
            code:"value", name:"Suma en Período"
        }, {
            code:"n", name:"Nº Muestras Período"
        }, {
            code:"avg", name:"Promedio Período"
        }, {
            code:"min", name:"Mínimo en el Período"
        }, {
            code:"max", name:"Máximo en el Período"
        }])
        
        this.inicializaOpcionesQuery();
        this.cambioVariable();
        this.cambioTemporalidad();
        this.rebuildQuery();
    }

    doResize(w, h) {        
        this.size = {width:w, height:h};
        this.mainRow.view.style.setProperty("max-height", h + "px");
        this.loaderContainer.view.style.setProperty("max-height", h + "px");
        this.chartLoader.view.style.setProperty("max-height", h + "px");
        this.chart.doResize(w, h);
    }

    onEdVariable_change() {this.cambioVariable()}
    onEdTemporalidad_change() {this.cambioTemporalidad()}
    onEdQuery_change() {this.cambioQuery()}
    onEdAcumulador_change() {this.cambioAcumulador()}

    async cambioVariable() {        
        if (!this.variable) {
            // Esconder
            console.log("No hay variable .. esconder");
            this.minzQuery = null;
            this.inicializaOpcionesQuery();
            this.rebuildQuery();
            return;
        }
        let idx = nivelesTemporalidad.indexOf(this.variable.temporality);
        if (idx < 0) {
            console.error("Invalid temporality:", this.variable.temporality);
            return;
        }
        // Verificar si cambió la temporalidad de la nueva variable
        if (!this.temporalidadVariableAnterior || this.variable.temporality != this.temporalidadVariableAnterior) {
            this.temporalidadVariableAnterior = this.variable.temporality;
            let bloques = bloquesTemporalidad.map((b, idx) => ({code:idx, name:b})).filter((b, i) => (i >= idx));
            let idxFavorito = bloquesFavoritos[this.variable.temporality];
            this.edTemporalidad.setRows(bloques, bloquesTemporalidad[idxFavorito]); 
            this.cambioTemporalidad();
        }
        this.inicializaOpcionesQuery();
        this.rebuildQuery();        
    }

    cambioTemporalidad() {
        let limites = getLimitesDefaultBloquesTemporalidad(this.edTemporalidad.value);
        this.start = limites.start;
        this.end = limites.end;
        if (this.minzQuery) this.minzQuery.temporality = nivelesTemporalidad[this.edTemporalidad.value];
        this.cambioPeriodo();
    }
    onCmdPeriodo_click() {
        this.showDialog("./periods/WPeriod", {temporality:nivelesTemporalidad[this.edTemporalidad.value], start:this.start, end:this.end}, ({start, end}) => {
            this.start = start;
            this.end = end;
            this.cambioPeriodo();
        })
    }
    cambioPeriodo() {
        let desc = describePeriodoParaBloqueTemporalidad(this.edTemporalidad.value, this.start, this.end);
        this.cmdPeriodo.text = desc;
        this.callRefreshChart();
    }

    onFiltro_click() {
        this.showDialog("common/WMinZFilters", {consulta:this.minzQuery}, q => {
            this.minzQuery = q;
            this.minzQuery.temporality = nivelesTemporalidad[this.edTemporalidad.value];
            this.cambioFiltro();
        })
    }
    async cambioFiltro() {
        if (!this.minzQuery) {            
            this.filtro.html = "";
            this.callRefreshChart();
            return;
        }
        await this.minzQuery.construyeDescripcionFiltros();
        let desc = this.minzQuery.descripcionFiltros.map(f => (f.etiqueta)).join(" y ");
        this.filtro.text = desc || "Filtrar"
        this.chart.setQuery(this.minzQuery);
        this.callRefreshChart();
    }
    cambioQuery() {
        this.inicializaOpcionesQuery();
        this.rebuildQuery();
    }
    cambioAcumulador() {
        if (this.minzQuery) this.minzQuery.accum = this.edAcumulador.value;
        this.callRefreshChart();
    }

    rebuildQuery() {
        if (!this.variable) {
            this.minzQuery = null;
        } else {
            this.minzQuery = new MinZQuery(window.zRepoClient, this.variable);
            this.minzQuery.temporality = nivelesTemporalidad[this.edTemporalidad.value];
            this.minzQuery.accum = this.edQuery.value == "labels"?"":this.edAcumulador.value;    
        }
        this.cambioFiltro(); // Llama a callRefreshChart
    }

    onCmdConfigurar_click() {
        const w = {
            "time-serie":"./chartProps/WTimeSerie",
            "pie":"./chartProps/WPie",
            "dim-serie":"./chartProps/WDimSerie",
            "heatmap":"./chartProps/WHeatMap",
            "gauge":"./chartProps/WGauge",
            "time-serie":"./chartProps/WTimeSerie",
            "time-dim":"./chartProps/WTimeDim",
            "labels":"./chartProps/WLabels",
        }
        this.showDialog(w[this.edQuery.value], this.opcionesQuery, opciones => {
            opciones.variable = this.variable;
            this.opcionesQuery = opciones;            
            this.callRefreshChart();
        })
    }

    callRefreshChart() {
        if (this.chartRefreshTimer) {
            clearTimeout(this.chartRefreshTimer);
            this.chartRefreshTimer = null;
        }
        this.chartRefreshTimer = setTimeout(_ => {
            this.chartRefreshTimer = null;
            this.refreshChart()
        }, 300);
    }
    async refreshChart() {
        if (this.chart.code != this.edQuery.value) {
            let panel = queryCharts[this.edQuery.value];
            await this.chartLoader.load(panel);
            this.chartLoader.content.doResize();
        }
        // Configurar query y chart
        this.chart.setQuery(this.minzQuery);
        this.chart.setOptions(this.opcionesQuery);
        // Refrescar
        await this.chart.refresh(this.start, this.end);
    }

    inicializaOpcionesQuery() {
        this.edAcumulador.show();
        switch(this.edQuery.value) {
            case "time-serie":
                this.cmdConfigurarRow.show();
                this.opcionesQuery = {serieType:"line", zoomTiempo:true};
                break;
            case "pie":
                this.cmdConfigurarRow.show();
                this.opcionesQuery = {
                    ruta:null, 
                    variable:this.minzQuery.variable,
                    leyendas:"inline",
                    tipoTorta:"dona-gradiente"
                };
                break;
            case "dim-serie":
                this.cmdConfigurarRow.show();
                this.opcionesQuery = {
                    ruta:null,
                    serieType:"bars",
                    variable:this.minzQuery.variable
                };
                break;
            case "heatmap":
                this.cmdConfigurarRow.show();
                this.opcionesQuery = {
                    rutaH:null, rutaV:null,
                    variable:this.minzQuery.variable,
                    indiceColor:0
                };
                break;
            case "gauge":
                this.cmdConfigurarRow.show();
                this.opcionesQuery = {
                    min:0, max:100000,
                    firstColor:"#0f9747",
                    firstLabel:"Bajo",
                    ranges:[{
                        value:50000, color:"#ee1f25",
                        label:"Alto"
                    }]
                };
                break;
            case "time-dim":
                this.cmdConfigurarRow.show();
                this.opcionesQuery = {
                    zoomTiempo:true, 
                    ruta:null,
                    serieType:"bars",
                    leyendas:"left",
                    variable:this.minzQuery.variable
                };
                break;
            case "labels":
                this.cmdConfigurarRow.show();
                this.edAcumulador.hide();
                this.opcionesQuery = {layout:{c:{text:"${sum}"}}};
                break;
        }
    }
}
ZVC.export(CustomQuery);