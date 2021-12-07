class HeatMap extends ZDashboardElement {
    get code() {return "heat-map"}
    onThis_init() {        
    }
    async refresh(start, end, operation = "refresh") {
        if (operation == "refresh") {
            this.drillStack = [];
            this.hDrillFilter = null;
            this.vDrillFilter = null;
        }
        this.start = start;
        this.end = end;

        this.dispose();

        if (!this.q || !this.options.rutaH || !this.options.rutaV) return;            
        if (operation == "refresh") {
            this.q.hGroupingDimension = this.options.rutaH;
            this.q.vGroupingDimension = this.options.rutaV;
        } // else viene en la query de los drills down/up
        let {promise, controller} = await this.q.query({
            format:"dim-dim", startTime:start.valueOf(), endTime:end.valueOf()
        });
        let canDrillDownH = this.q.hGroupingDimension.indexOf(".") > 0;
        let canDrillDownV = this.q.vGroupingDimension.indexOf(".") > 0;
        let data = await promise;
        data = data.map(d => ({
            hName:d.hDim.name, hCode:d.hDim.code,
            vName:d.vDim.name, vCode:d.vDim.code,
            valor:d.resultado
        }))        

        // Contar filas y columnas para calcular tamaño mínimo
        let filas = {}, columnas = {};
        data.forEach(row => {
            filas[row.vCode] = {code:row.vCode, name:row.vName};
            columnas[row.hCode] = {code:row.hCode, name:row.hName};
        })
        filas = Object.keys(filas).map(key => (filas[key]));
        columnas = Object.keys(columnas).map(key => (columnas[key]));
        
        let nFilas = filas.length;
        let nColumnas = columnas.length;

        this.root.setThemes([am5themes_Animated.new(this.root), am5themes_Dark.new(this.root)]);
        let chart = this.root.container.children.push(am5xy.XYChart.new(this.root, {panX: false, panY: false, wheelX: "none", wheelY: "none", layout: this.root.verticalLayout}));

        let unidad;
        if (this.q.accum == "n") {
            unidad = "N°";
        } else {
            unidad = this.q.variable.options.unit;
        }  

        let yRenderer = am5xy.AxisRendererY.new(this.root, {visible: false, minGridDistance: 30});  // , inversed: true
        //yRenderer.grid.template.set("visible", false);
        yRenderer.labels.template.setAll({
            centerY: am5.p50,
            centerX: am5.p100,
            paddingRight: 15
        });
        if (canDrillDownV) {
            yRenderer.labels.template.setup = target => {
                target.set("background", am5.Rectangle.new(this.root, {
                    fill: am5.color(0x000000),
                    fillOpacity: 0
                }));
            }
            yRenderer.labels.template.set("cursorOverStyle", "crosshair");
            yRenderer.labels.template.events.on("click", e => {
                this.drilldown("v", e.target.dataItem.dataContext.vCode);
            });
        }
        let yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(this.root, {maxDeviation: 0, renderer: yRenderer, categoryField: "name"}));

        let xRenderer = am5xy.AxisRendererX.new(this.root, {visible: false, minGridDistance: 30, opposite:true});
        //xRenderer.grid.template.set("visible", false);
        xRenderer.labels.template.setAll({
            rotation: -90,
            centerY: am5.p50,
            centerX: am5.p100,
            paddingRight: 15,
        });
        if (canDrillDownH) {
            xRenderer.labels.template.setup = target => {
                target.set("background", am5.Rectangle.new(this.root, {
                    fill: am5.color(0x000000),
                    fillOpacity: 0
                }));
            }
            xRenderer.labels.template.set("cursorOverStyle", "crosshair");
            xRenderer.labels.template.events.on("click", e => {
                this.drilldown("h", e.target.dataItem.dataContext.hCode);
            });
        }
        let xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(this.root, {renderer: xRenderer, categoryField: "name"}));

        let series = chart.series.push(am5xy.ColumnSeries.new(this.root, {
            calculateAggregates: true,
            stroke: am5.color(0xffffff),
            clustered: false,
            xAxis: xAxis,
            yAxis: yAxis,
            categoryXField: "hName",
            categoryYField: "vName",
            valueField: "valor"
        }));

        series.columns.template.setAll({
            tooltipText: "{categoryY}, {categoryX}: {value} [[" + unidad + "]]",
            strokeOpacity: 1,
            strokeWidth: 2,
            width: am5.percent(100),
            height: am5.percent(100)
        });

        series.set("heatRules", [{
            target: series.columns.template,
            min: am5.color(0xfffb77),
            max: am5.color(0xfe131a),
            dataField: "value",
            key: "fill"
        }]);

        let heatLegend = chart.bottomAxesContainer.children.push(am5.HeatLegend.new(this.root, {
            orientation: "horizontal",
            endColor: am5.color(0xfffb77),
            startColor: am5.color(0xfe131a)
        }));

        series.columns.template.events.on("pointerover", function(event) {
            var di = event.target.dataItem;
            if (di) {
                heatLegend.showValue(di.get("value", 0));
            }
        });

        this.chartContainer.style.setProperty("min-height", "300px");
        series.events.on("datavalidated", () => {
            heatLegend.set("startValue", series.getPrivate("valueHigh"));
            heatLegend.set("endValue", series.getPrivate("valueLow"));
            setTimeout(_ => {
                let cellHeight = 30, cellWidth = 50;
                let adjustHeight = nFilas * cellHeight + xAxis.height() + heatLegend.height() + 40;
                this.chartContainer.style.setProperty("min-height", adjustHeight + "px");
                let adjustWidth = nColumnas * cellWidth + yAxis.width() + 50;
                this.chartContainer.style.setProperty("min-width", adjustWidth + "px");
            }, 200);
            
        });

        xAxis.data.setAll(columnas);
        yAxis.data.setAll(filas);
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

    handleHover(column) {
        if (!isNaN(column.dataItem.value)) {
            this.heatLegend.valueAxis.showTooltipAt(column.dataItem.value)
        } else {
            this.heatLegend.valueAxis.hideTooltip();
        }
    }

    drilldown(pos, dimValue) {
        this.drillStack.push({query:this.q, hDrillFilter:this.hDrillFilter, vDrillFilter:this.vDrillFilter});
        let q2 = MinZQuery.cloneQuery(this.q);
        if (pos == "h") {
            this.hDrillFilter = {ruta:this.q.hGroupingDimension, valor:dimValue};
            let p = q2.hGroupingDimension.lastIndexOf(".");
            q2.hGroupingDimension = this.q.hGroupingDimension.substr(0,p);
        } else {
            this.vDrillFilter = {ruta:this.q.vGroupingDimension, valor:dimValue};
            let p = q2.vGroupingDimension.lastIndexOf(".");
            q2.vGroupingDimension = this.q.vGroupingDimension.substr(0,p);
        }
        // Reconstruir filtros, desde la query 0 (filtro original) agregando el drill de este nivel
        q2.filters = this.drillStack[0].query.filters?JSON.parse(JSON.stringify(this.drillStack[0].query.filters)):[]; 
        if (this.hDrillFilter) q2.filters.push(this.hDrillFilter);
        if (this.vDrillFilter) q2.filters.push(this.vDrillFilter);

        this.setQuery(q2);
        this.refresh(this.start, this.end, "push");
    }
    drillUp() {
        let e = this.drillStack[this.drillStack.length - 1];
        this.drillStack.splice(this.drillStack.length - 1, 1);
        this.setQuery(e.query);
        this.hDrillFilter = e.hDrillFilter;
        this.vDrillFilter = e.vDrillFilter;
        this.refresh(this.start, this.end, "pop");
    }
}
ZVC.export(HeatMap);