class DimSerie extends ZDashboardElement {
    get code() {return "dim-serie"}
    onThis_init() {
    }
    async refresh(start, end, operation = "refresh") {
        if (operation == "refresh") this.drillStack = [];
        this.start = start;
        this.end = end;

        if (this.chart) {
            await this.chart.dispose();
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
        console.log("data2", data);

        am4core.useTheme(am4themes_dark);
        am4core.useTheme(am4themes_animated);
        let is3d = this.options.serieType == "3d-columns" || this.options.serieType == "3d-bars";
        let invertedAxes = this.options.serieType == "bars" || this.options.serieType == "3d-bars";
        let chart;
        if (is3d) {
            chart = am4core.create(this.chartContainerId, am4charts.XYChart3D);
        } else {
            chart = am4core.create(this.chartContainerId, am4charts.XYChart);
        }
        chart.data = data;

        let categoryAxis, valueAxis;
        if (invertedAxes) {
            valueAxis = chart.xAxes.push(new am4charts.ValueAxis());
            categoryAxis = chart.yAxes.push(new am4charts.CategoryAxis());
            categoryAxis.renderer.inversed = true;
            categoryAxis.renderer.grid.template.location = 0;
        } else {
            valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
            categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
        }
        categoryAxis.dataFields.category = "categoria";

        let series;
        switch (this.options.serieType) {
            case "bars":
            case "columns":
                series = chart.series.push(new am4charts.ColumnSeries());
                break;
            case "3d-bars":
            case "3d-columns":
                series = chart.series.push(new am4charts.ColumnSeries3D());
                break;
        }
        series.name = this.q.variable.name;
        if (invertedAxes) {
            series.dataFields.valueX = "valor";
            series.dataFields.categoryY = "categoria";
        } else {
            series.dataFields.valueY = "valor";
            series.dataFields.categoryX = "categoria";
        }
        
        if (this.q.accum == "n") {
            valueAxis.title.text = "N°";
        } else {
            valueAxis.title.text = this.q.variable.options?this.q.variable.options.unit:"S/U";
        }        

        series.tooltipText = this.q.variable.name + `: [bold]{value${invertedAxes?"X":"Y"}}[/]`;
       
        chart.cursor = new am4charts.XYCursor();
        chart.cursor.lineY.opacity = 0;

        if (canDrillDown) {
            series.columns.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;
            series.columns.template.events.on("hit", e => {
                setTimeout(_ => this.drilldown(e.target.dataItem.dataContext.codigo), 50);
            })
        }

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

    drilldown(dimValue) {
        console.log("drillDown", dimValue);
        console.log("query", this.q);
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