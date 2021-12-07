class DimSerie extends ZDashboardElement {
    get code() {return "dim-serie"}
    onThis_init() {
    }
    async refresh(start, end, operation = "refresh") {
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

        this.root.setThemes([am5themes_Animated.new(this.root), am5themes_Dark.new(this.root)])
        let chart = this.root.container.children.push(am5xy.XYChart.new(this.root, {panX: true, panY: true, wheelX: "panX", wheelY: "zoomX"}));
        chart.set("cursor", am5xy.XYCursor.new(this.root, {behavior: "none"}));

        let invertedAxes = this.options.serieType == "bars";
        let unit;
        if (this.q.accum == "n") unit = "N°";
        else unit = this.q.variable.options?this.q.variable.options.unit:"S/U";            

        let categoryAxis, valueAxis;
        if (invertedAxes) {
            categoryAxis = chart.yAxes.push(am5xy.CategoryAxis.new(this.root, {
                maxDeviation: 0,
                categoryField:"categoria",
                renderer: am5xy.AxisRendererY.new(this.root, { minGridDistance: 30 }),
                tooltip: am5.Tooltip.new(this.root, {})
            }));
            valueAxis = chart.xAxes.push(am5xy.ValueAxis.new(this.root, {
                renderer: am5xy.AxisRendererX.new(this.root, {})
            }));
            valueAxis.children.push(am5.Label.new(this.root, { text: unit, x:am5.p50, centerX: am5.p50 }), 0);
        } else {
            var xRenderer = am5xy.AxisRendererX.new(this.root, { minGridDistance: 30 });
            xRenderer.labels.template.setAll({
              rotation: -90,
              centerY: am5.p50,
              centerX: am5.p100,
              paddingRight: 15
            });
            categoryAxis = chart.xAxes.push(am5xy.CategoryAxis.new(this.root, {
                maxDeviation: 0,
                categoryField:"categoria",
                renderer: xRenderer, 
                tooltip: am5.Tooltip.new(this.root, {})
            }));
            valueAxis = chart.yAxes.push(am5xy.ValueAxis.new(this.root, {
                renderer: am5xy.AxisRendererY.new(this.root, {})
            }));
            valueAxis.children.moveValue(am5.Label.new(this.root, { text: unit, rotation: -90, y: am5.p50, centerX: am5.p50 }), 0);
        }

        let series;
        switch (this.options.serieType) {
            case "bars":
                series = chart.series.push(am5xy.ColumnSeries.new(this.root, {
                    name:this.q.variable.name, xAxis: valueAxis, yAxis: categoryAxis,
                    valueXField: "valor", categoryYField: "categoria",
                    tooltip: am5.Tooltip.new(this.root, { dy: -25, labelText: "{valueX} [[" + unit + "]]"})
                }));
                break;
            case "columns":
                series = chart.series.push(am5xy.ColumnSeries.new(this.root, {
                    name:this.q.variable.name, xAxis: categoryAxis, yAxis: valueAxis,
                    valueYField: "valor", categoryXField: "categoria",
                    tooltip: am5.Tooltip.new(this.root, { dy: -25, labelText: "{valueY} [[" + unit + "]]"})
                }));
                break;
        }
        let template = series.columns.template;
        if (canDrillDown) {
            template.set("cursorOverStyle", "crosshair");
            template.events.on("click", e => {
                setTimeout(_ => this.drilldown(e.target.dataItem.dataContext.codigo), 50);
            })
        }

        categoryAxis.data.setAll(data);
        series.data.setAll(data);

        if (this.drillStack.length) {
            let button = this.root.container.children.unshift(am5.Button.new(this.root, {
                dx:10, dy:10, 
                align:"left", valign:"top",
                label: am5.Label.new(this.root, {text: "< Volver"})
            }))
            button.events.on("click", _ => {
                setTimeout(_ => this.drillUp(), 50);
            });
        }

        this.chart = chart;
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
ZVC.export(DimSerie);