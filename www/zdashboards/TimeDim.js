class TimeDim extends ZDashboardElement {
    get code() {return "time-dim"}
    onThis_init() {
    }
    toMs(l) {
        if (!window.timeZone) window.timeZone = moment.tz.guess();
        let m = moment.tz(window.timeZone);
        m.year(l.year); m.month(l.month - 1); m.date(l.day);
        m.hour(l.hour); m.minute(l.minute); m.second(0); m.millisecond(0);
        return m.valueOf();
    }
    getBaseTemporality() {
        if (this.q.temporality == "5m") return {baseInterval:{"timeUnit": "minute","count": 5}, tooltipDateFormat:"dd/MMM/yyyy HH:mm"}
        else if (this.q.temporality == "15m") return {baseInterval:{"timeUnit": "minute","count": 15}, tooltipDateFormat: "dd/MMM/yyyy HH:mm"}
        else if (this.q.temporality == "30m") return {baseInterval:{"timeUnit": "minute","count": 30}, tooltipDateFormat: "dd/MMM/yyyy HH:mm"}
        else if (this.q.temporality == "1h") return {baseInterval: {"timeUnit": "hour","count": 1}, tooltipDateFormat:"dd/MMM/yyyy HH:mm"}
        else if (this.q.temporality == "1d") return {baseInterval: {"timeUnit": "day","count": 1}, tooltipDateFormat: "dd/MMM/yyyy"}
        else if (this.q.temporality == "1M") return {baseInterval: {"timeUnit": "month","count": 1}, tooltipDateFormat: "MMM/yyyy"} 
        else if (this.q.temporality == "3M") return {baseInterval: {"timeUnit": "month","count": 3}, tooltipDateFormat:"MMM/yyyy"}
        else if (this.q.temporality == "4M") return {baseInterval: {"timeUnit": "month","count": 4}, tooltipDateFormat:"MMM/yyyy"}        
        else if (this.q.temporality == "6M") return {baseInterval: {"timeUnit": "month","count": 12}, tooltipDateFormat:"MMM/yyyy"}
        else if (this.q.temporality == "1Y") return {baseInterval: {"timeUnit": "year","count": 1}, tooltipDateFormat:"yyyy"}
    }

    async refresh(start, end, operation = "refresh") {
        if (operation == "refresh") this.drillStack = [];
        this.start = start;
        this.end = end;

        this.dispose();

        if (!this.q || !this.options.ruta) return;   
        
        // Niveles temporalidad para drillDown
        let nivelTemporalidadQuery = nivelesTemporalidad.indexOf(this.q.temporality);
        let nivelTemporalidadVariable = nivelesTemporalidad.indexOf(this.q.variable.temporality);

        if (operation == "refresh") {
            this.q.groupingDimension = this.options.ruta;
        } // else viene en la query de los drills down/up
        let canDrillDown = nivelTemporalidadQuery > nivelTemporalidadVariable;

        let {promise, controller} = await this.q.query({
            format:"time-dim", startTime:start.valueOf(), endTime:end.valueOf()
        });
        
        let data = await promise;

        data = data.sort((d1, d2) => (d1.dim.order - d2.dim.order));
        data = data.map(d => ({
            time:this.toMs(d.localTime),
            categoria:d.dim.name,
            valor:d.resultado,
            codigo:d.dim.code
        }))
        // Agrupar por tiempo
        let map = {};
        let categorias = {};
        data.forEach(d => {
            let r = map[d.time];
            if (!r) {
                map[d.time] = {
                    time:d.time
                }
                r = map[d.time];
            }
            r[d.codigo] = d.valor;
            if (!categorias[d.codigo]) {
                categorias[d.codigo] = d.categoria;                
            }
        });
        data = Object.values(map).sort((v1, v2) => (v1 - v2));

        this.root.setThemes([am5themes_Animated.new(this.root), am5themes_Dark.new(this.root)])
        let chart = this.root.container.children.push(am5xy.XYChart.new(this.root, {
            panX: true, panY: true, wheelX: "panX", wheelY: "zoomX",
            layout: (this.options.leyendas == "top" || this.options.leyendas == "bottom")?this.root.verticalLayout:this.root.horizontalLayout
        }));
        chart.set("cursor", am5xy.XYCursor.new(this.root, {behavior: "none"}));

        let baseTemporality = this.getBaseTemporality();
        this.root.dateFormatter.set("dateFormat", baseTemporality.tooltipDateFormat);
        let dateAxis = chart.xAxes.push(am5xy.DateAxis.new(this.root, {
            baseInterval: baseTemporality.baseInterval,
            renderer: am5xy.AxisRendererX.new(this.root, {cellStartLocation: 0.1,cellEndLocation: 0.9}),
            tooltip: am5.Tooltip.new(this.root, {})
        }));
        let valueAxis = chart.yAxes.push(am5xy.ValueAxis.new(this.root, {
            renderer: am5xy.AxisRendererY.new(this.root, {})
        }));
        let unit;
        if (this.q.accum == "n") unit = "N°";
        else unit = this.q.variable.options?this.q.variable.options.unit:"S/U";            
        valueAxis.children.moveValue(am5.Label.new(this.root, { text: unit, rotation: -90, y: am5.p50, centerX: am5.p50 }), 0);

        let legend;
        if (this.options.leyendas != "none") {
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

        Object.keys(categorias).forEach(codigo => {
            let series = chart.series.push(am5xy.ColumnSeries.new(this.root, {
                name:categorias[codigo], xAxis: dateAxis, yAxis: valueAxis,
                valueYField: codigo, valueXField: "time"
            }));
            series.columns.template.setAll({
                tooltipText: "[bold]{name}[/]\n{valueX.formatDate()}: {valueY} [[" + unit + "]]",
                width: am5.percent(90),
                tooltipY: 0
            });
            series.data.setAll(data);
            if (legend) legend.data.push(series);

            if (canDrillDown) {
                series.columns.template.set("cursorOverStyle", "crosshair");
                series.columns.template.events.on("click", e => {
                    setTimeout(_ => this.drilldownTime(e.target.dataItem.dataContext.time), 50);
                })
            }
        });

        if (this.options.zoomTiempo) {
            chart.set("scrollbarX", am5.Scrollbar.new(this.root, {orientation: "horizontal"}));
        }

        dateAxis.start = 0.0;
        dateAxis.keepSelection = true;

        if (this.drillStack.length) {
            let button = chart.plotContainer.children.push(am5.Button.new(this.root, {
                dx:10, dy:10, 
                label: am5.Label.new(this.root, {text: "< Volver"})
            }))
            button.events.on("click", _ => {
                setTimeout(_ => this.drillUp(), 50);
            });
        }

        /*
        let valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        let dateAxis = chart.xAxes.push(new am4charts.DateAxis());
        this.adjustTemporality(dateAxis);        

        if (this.q.accum == "n") {
            valueAxis.title.text = "N°";
        } else {
            valueAxis.title.text = this.q.variable.options?this.q.variable.options.unit:"S/U";
        }    
        if (this.options.leyendas != "none") {
            chart.legend = new am4charts.Legend();
            chart.legend.position = this.options.leyendas;
        }

        chart.cursor = new am4charts.XYCursor();
        chart.cursor.lineY.opacity = 0;
        Object.keys(categorias).forEach(codigo => {
            let series = chart.series.push(new am4charts.ColumnSeries());
            series.dataFields.valueY = codigo;
            series.dataFields.dateX = "time";
            series.name = categorias[codigo];
            if (this.options.zoomTiempo) {
                chart.scrollbarX = new am4charts.XYChartScrollbar();
                chart.scrollbarX.series.push(series);
            }
            if (canDrillDown) {
                series.columns.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;
                series.columns.template.events.on("hit", e => {
                    //console.log("hit", e.target.dataItem);
                    setTimeout(_ => this.drilldownTime(e.target.dataItem.dataContext.time), 50);
                })
            }
        })
        
        chart.data = data;        

        chart.cursor = new am4charts.XYCursor();
        chart.cursor.lineY.opacity = 0;

        dateAxis.start = 0.0;
        dateAxis.keepSelection = true;

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
        */
        this.chart = chart;
    }

    drilldownTime(time) {
        let d = moment.tz(time, window.timeZone);
        let q2 = MinZQuery.cloneQuery(this.q);
        this.drillStack.push({query:this.q, start:this.start, end:this.end});
        let newTemp, start, end;
        switch (this.q.temporality) {
            case "1y": 
                newTemp = "1M";
                start = d.clone();
                end = d.clone().add(1, "year");
                break;
            case "6M":
                newTemp = "1M";
                start = d.clone();
                end = d.clone().add(6, "months");
                break;
            case "4M":
                newTemp = "1M";
                start = d.clone();
                end = d.clone().add(4, "months");
                break;
            case "3M":
                newTemp = "1M";
                start = d.clone();
                end = d.clone().add(3, "months");
                break;
            case "1M":
                newTemp = "1d";
                start = d.clone();
                end = d.clone().add(1, "month");
                break;
            case "1d":
                newTemp = "1h";
                start = d.clone();
                end = d.clone().add(1, "day");
                break;
            case "12h":
                newTemp = "1h";
                start = d.clone();
                end = d.clone().add(12, "hours");
                break;
            case "6h":
                newTemp = "1h";
                start = d.clone();
                end = d.clone().add(6, "hours");
                break;
            case "1h":
                newTemp = this.q.variable.temporality;
                start = d.clone();
                end = d.clone().add(1, "hours");
                break;
            case "30m":
                newTemp = this.q.variable.temporality;
                start = d.clone();
                end = d.clone().add(30, "minutes");
                break;
            case "15m":
                newTemp = this.q.variable.temporality;
                start = d.clone();
                end = d.clone().add(15, "minutes");
                break;
        }
        q2.temporality = newTemp;
        this.setQuery(q2);
        this.refresh(start, end, "push");
    }

    drillUp() {
        let e = this.drillStack[this.drillStack.length - 1];
        this.drillStack.splice(this.drillStack.length - 1, 1);
        this.setQuery(e.query);
        this.refresh(e.start, e.end, "pop");
    }
}
ZVC.export(TimeDim);