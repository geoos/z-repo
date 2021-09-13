const queryCharts = {
    "empty":"zdashboards/EmptyChart",
    "time-serie":"zdashboards/TimeSerie",
}

class CustomQuery extends ZCustomController {    
    get chart() {return this.chartLoader.content}
    get variable() {return this.edVariable.selectedRow}

    async onThis_init() {
        this.edVariable.setGroups(window.zrepo.variablesTree, "name", "variables");
        this.edQuery.setRows([{
            code:"time-serie", name:"Serie de Tiempo"
        }, {
            code:"pie", name:"Gráfico de Torta"
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
        this.edTipoSerie.setRows([{
            code:"line", name:"Gráfico de Líneas"
        }, {
            code:"columns", name:"Gráfico de Columnas"
        }, {
            code:"area", name:"Gráfico de Área"
        }])
        this.cambioVariable();
        this.cambioTemporalidad();
        this.rebuildQuery();
    }

    doResize(w, h) {        
        this.size = {width:w, height:h};
        this.chart.doResize(w, h);
    }

    onEdVariable_change() {this.cambioVariable()}
    onEdTemporalidad_change() {this.cambioTemporalidad()}
    onEdQuery_change() {this.cambioQuery()}
    onEdAcumulador_change() {this.cambioAcumulador()}
    onEdTipoSerie_change() {this.cambioTipoSerie()}

    async cambioVariable() {        
        if (!this.variable) {
            // Esconder
            console.log("No hay variable .. esconder");
            this.minzQuery = null;
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
        this.rebuildQuery();        
    }
    cambioTipoSerie() {
        this.callRefreshChart();
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
            this.minzQuery.accum = this.edAcumulador.value;    
        }
        this.cambioFiltro(); // Llama a callRefreshChart
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
        }
        // Configurar query y chart
        this.chart.setQuery(this.minzQuery);
        this.chart.setOption("serieType", this.edTipoSerie.value);
        // Refrescar
        await this.chart.refresh(this.start, this.end);
    }
}
ZVC.export(CustomQuery);