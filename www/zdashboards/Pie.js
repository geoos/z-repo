class Pie extends ZDashboardElement {
    get code() {return "pie"}
    onThis_init() {
    }
    async refresh(start, end, operation = "refresh") {
        try {
            if (operation == "refresh") this.drillStack = [];            
            this.start = start;
            this.end = end;
            if (this.chart) {
                this.chart.dispose();
                this.chart = null;
            }            
            if (!this.q || !this.options.ruta) return;            
            if (operation == "refresh") {
                this.q.groupingDimension = this.options.ruta;
            } // else viene en la query de los drills down/up
            let {promise, controller} = await this.q.query({
                format:"dim-serie", startTime:start.valueOf(), endTime:end.valueOf()
            });
            let canDrillDown = this.q.groupingDimension.indexOf(".") > 0;
            let data = await promise;
            //console.log("data", data);
            data = data.sort((d1, d2) => (d1.dim.order - d2.dim.order));
            data = data.map(d => ({
                categoria:d.dim.name,
                valor:d.resultado,
                codigo:d.dim.code
            }))
            //console.log("data2", data);

            am4core.useTheme(am4themes_dark);
            am4core.useTheme(am4themes_animated);     
            let chart, pieSeries;
            let es3d = this.options.tipoTorta == "3d" || this.options.tipoTorta == "dona-3d";
            if (es3d) {       
                chart = am4core.create(this.chartContainerId, am4charts.PieChart3D);
            } else {
                chart = am4core.create(this.chartContainerId, am4charts.PieChart);
            }
            chart.data = data;
            if (es3d) {
                pieSeries = chart.series.push(new am4charts.PieSeries3D());
            } else {
                pieSeries = chart.series.push(new am4charts.PieSeries());
            }
            pieSeries.dataFields.value = "valor";
            pieSeries.dataFields.category = "categoria";
            if (this.options.tipoTorta == "dona-2d" || this.options.tipoTorta == "dona-gradiente" || this.options.tipoTorta == "dona-3d") {
                pieSeries.innerRadius = am4core.percent(50);
            }
            if (this.options.leyendas != "inline" && this.options.leyendas != "none") {
                pieSeries.ticks.template.disabled = true;
                pieSeries.labels.template.disabled = true;                
            }
            
            if (this.options.tipoTorta == "dona-gradiente") {
                let rgm = new am4core.RadialGradientModifier();
                rgm.brightnesses.push(-0.8, -0.8, -0.5, 0, - 0.5);
                pieSeries.slices.template.fillModifier = rgm;
                pieSeries.slices.template.strokeModifier = rgm;
                pieSeries.slices.template.strokeOpacity = 0.4;
                pieSeries.slices.template.strokeWidth = 0;
            }

            if (canDrillDown) {
                pieSeries.slices.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;
                pieSeries.slices.template.events.on("hit", e => {
                    setTimeout(_ => this.drilldown(e.target.dataItem.dataContext.codigo), 50);
                })
            }

            if (this.options.leyendas != "inline" && this.options.leyendas != "none") {
                chart.legend = new am4charts.Legend();
                chart.legend.position = this.options.leyendas;
            }

            if (this.drillStack.length) {
                let buttonContainer = chart.chartContainer.createChild(am4core.Container);
                buttonContainer.shouldClone = false;
                buttonContainer.align = "left";
                buttonContainer.valign = "top";
                buttonContainer.zIndex = Number.MAX_SAFE_INTEGER;
                buttonContainer.marginTop = 5;
                buttonContainer.marginLeft = 5;
                buttonContainer.layout = "horizontal";
    
                let colorSet = new am4core.ColorSet();
                colorSet.next(); colorSet.next();
                let fillColor = colorSet.next();
                let button = buttonContainer.createChild(am4core.Button);
                button.label.text = "< Volver";
                button.background.fill = fillColor;
                button.width = 80;
                button.events.on("hit", _ => {
                    setTimeout(_ => this.drillUp(), 50);
                });
            }

            this.chart = chart;
        } catch(error) {
            console.error(error);
        }
    }

    drilldown(dimValue) {
        this.drillStack.push(this.q);
        let q2 = MinZQuery.cloneQuery(this.q);
        let p = q2.groupingDimension.lastIndexOf(".");
        q2.groupingDimension = this.q.groupingDimension.substr(0,p);
        // Reconstruir filtros, desde la query 0 (filtro original) agregando el drill de este nivel
        q2.filters = this.drillStack[0].filters?JSON.parse(JSON.stringify(this.drillStack[0].filters)):[];        
        q2.filters.push({ruta:this.q.groupingDimension, valor:dimValue});
        this.setQuery(q2);
        this.refresh(this.start, this.end, "push");
    }
    drillUp() {
        let q = this.drillStack[this.drillStack.length - 1];
        this.drillStack.splice(this.drillStack.length - 1, 1);
        this.setQuery(q);
        this.refresh(this.start, this.end, "pop");
    }
}
ZVC.export(Pie);