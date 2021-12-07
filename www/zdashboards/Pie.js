class Pie extends ZDashboardElement {
    get code() {return "pie"}
    onThis_init() {
    }
    async refresh(start, end, operation = "refresh") {
        try {
            if (operation == "refresh") this.drillStack = [];            
            this.start = start;
            this.end = end;
            this.dispose();
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

            let esDona = this.options.tipoTorta == "dona-2d" || this.options.tipoTorta == "dona-gradiente";
            this.root.setThemes([am5themes_Animated.new(this.root), am5themes_Dark.new(this.root)])
            let chart = this.root.container.children.push(am5percent.PieChart.new(this.root, {
                innerRadius: esDona?am5.percent(50):undefined,
                layout: (this.options.leyendas == "top" || this.options.leyendas == "bottom")?this.root.verticalLayout:this.root.horizontalLayout
            }));
            let pieSeries = chart.series.push(
                am5percent.PieSeries.new(this.root, {
                    valueField: "valor",
                    categoryField: "categoria",
                    endAngle: 270
                })
            );
            if (this.options.leyendas != "inline" && this.options.leyendas != "none") {
                pieSeries.ticks.template.set("visible", false);
                pieSeries.labels.template.set("visible", false);
            }
            if (this.options.tipoTorta == "dona-gradiente") {
                let rgm = am5.RadialGradient.new(this.root, {
                    stops: [{brighten: -0.8}, {brighten: -0.8}, {brighten: -0.5}, {brighten: 0}, {brighten: -0.5}]
                });
                pieSeries.slices.template.set("strokeOpacity", 0);
                pieSeries.slices.template.set("fillGradient", rgm);
            }
            
            if (canDrillDown) {
                pieSeries.slices.template.cursorOverStyle = "crosshair";
                pieSeries.slices.template.events.on("click", e => {
                    setTimeout(_ => this.drilldown(e.target.dataItem.dataContext.codigo), 50);
                })
            }

            let legend;
            if (this.options.leyendas != "inline" && this.options.leyendas != "none") {
                if (this.options.leyendas == "right") {
                    legend = chart.children.push(am5.Legend.new(this.root, {
                        centerY: am5.percent(50),
                        y: am5.percent(50),
                        marginTop: 15,
                        marginBottom: 15,
                        layout: this.root.verticalLayout
                    }));
                } else if (this.options.leyendas == "left") {
                    legend = chart.children.unshift(am5.Legend.new(this.root, {
                        centerY: am5.percent(50),
                        y: am5.percent(50),
                        marginTop: 15,
                        marginBottom: 15,
                        layout: this.root.verticalLayout
                    }));
                } else if (this.options.leyendas == "top") {
                    legend = chart.children.unshift(am5.Legend.new(this.root, {
                        centerX: am5.percent(50),
                        x: am5.percent(50),
                        marginTop: 15,
                        marginBottom: 15,
                        layout: this.root.horizontalLayout
                    }));
                } else if (this.options.leyendas == "bottom") {
                    legend = chart.children.push(am5.Legend.new(this.root, {
                        centerX: am5.percent(50),
                        x: am5.percent(50),
                        marginTop: 15,
                        marginBottom: 15,
                        layout: this.root.horizontalLayout
                    }));
                }
            }

            pieSeries.data.setAll(data);
            if (legend) legend.data.setAll(pieSeries.dataItems);

            if (this.drillStack.length) {
            let button = chart.chartContainer.children.push(am5.Button.new(this.root, {
                dx:10, dy:10, 
                label: am5.Label.new(this.root, {text: "< Volver"})
            }))
            button.events.on("click", _ => {
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