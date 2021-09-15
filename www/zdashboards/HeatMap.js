class HeatMap extends ZCustomController {
    get code() {return "dim-serie"}
    onThis_init() {
    }
    onThis_deactivated() {
        if (this.chart) {
            this.chart.dispose();
            this.chart = null;
        }
    }
    doResize(w, h) {
        if (this.chart) {
            this.chart.invalidate();
        }
    }
    setQuery(q) {
        this.q = q;
    }
    setOptions(opts) {
        this.options = opts;
    }
    async refresh(start, end, operation = "refresh") {
        if (operation == "refresh") {
            this.drillStack = [];
            this.hDrillFilter = null;
            this.vDrillFilter = null;
        }
        this.start = start;
        this.end = end;

        if (this.chart) {
            await this.chart.dispose();
            this.chart = null;
        }

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
        //console.log("data", data);
        //data = data.sort((d1, d2) => (d1.dim.order - d2.dim.order));
        data = data.map(d => ({
            hName:d.hDim.name, hCode:d.hDim.code,
            vName:d.vDim.name, vCode:d.vDim.code,
            valor:d.resultado
        }))
        //console.log("data2", data);

        am4core.useTheme(am4themes_dark);
        am4core.useTheme(am4themes_animated);
        let chart = am4core.create("heatMapContainer", am4charts.XYChart);
        chart.data = data;
        let xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
        xAxis.dataFields.category = "hName";
        xAxis.renderer.minGridDistance = 40;
        if (canDrillDownH) {
            xAxis.renderer.labels.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;
            xAxis.renderer.labels.template.events.on("hit", e => {
                this.drilldown("h", e.target.dataItem.dataContext.hCode);
            });
        }
        let yAxis = chart.yAxes.push(new am4charts.CategoryAxis());
        yAxis.dataFields.category = "vName";
        yAxis.renderer.grid.template.disabled = true;
        yAxis.renderer.inversed = true;
        yAxis.renderer.minGridDistance = 30;
        if (canDrillDownV) {
            yAxis.renderer.labels.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;
            yAxis.renderer.labels.template.events.on("hit", e => {
                this.drilldown("v", e.target.dataItem.dataContext.vCode);
            });
        }

        let series= chart.series.push(new am4charts.ColumnSeries());
        series.name = this.q.variable.name;
        series.dataFields.value = "valor";
        series.dataFields.categoryX = "hName";
        series.dataFields.categoryY = "vName";
        
        let unidad;
        if (this.q.accum == "n") {
            unidad = "N°";
        } else {
            unidad = this.q.variable.options.unit;
        }  

        let bgColor = new am4core.InterfaceColorSet().getFor("background");

        let columnTemplate = series.columns.template;
        columnTemplate.strokeWidth = 1;
        columnTemplate.strokeOpacity = 0.2;
        columnTemplate.stroke = bgColor;
        columnTemplate.tooltipText = "{hName}, {vName}: {value.workingValue.formatNumber('#.')}";
        columnTemplate.width = am4core.percent(100);
        columnTemplate.height = am4core.percent(100);

        let labelBullet = series.bullets.push(new am4charts.LabelBullet());
        labelBullet.label.text = "{value} " + unidad + "";
        labelBullet.locationY = 0.5;
        labelBullet.label.hideOversized = true;

        series.heatRules.push({
            target: columnTemplate,
            property: "fill",
            min: am4core.color(bgColor),
            max: chart.colors.getIndex(0)
        });

        let heatLegend = chart.bottomAxesContainer.createChild(am4charts.HeatLegend);
        heatLegend.width = am4core.percent(100);
        heatLegend.series = series;
        heatLegend.valueAxis.renderer.labels.template.fontSize = 9;
        heatLegend.valueAxis.renderer.minGridDistance = 30;
        this.heatLegend = heatLegend;

        series.columns.template.events.on("over", event => {
            this.handleHover(event.target);
        })        
        series.columns.template.events.on("hit", event => {
            this.handleHover(event.target);
        })
        series.columns.template.events.on("out", event => {
            heatLegend.valueAxis.hideTooltip();
        })

        if (this.drillStack.length) {
            let buttonContainer = chart.plotContainer.createChild(am4core.Container);
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
    }

    handleHover(column) {
        if (!isNaN(column.dataItem.value)) {
            this.heatLegend.valueAxis.showTooltipAt(column.dataItem.value)
        } else {
            this.heatLegend.valueAxis.hideTooltip();
        }
    }

    drilldown(pos, dimValue) {
        console.log("drillDown", pos, dimValue);
        console.log("query", this.q);
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