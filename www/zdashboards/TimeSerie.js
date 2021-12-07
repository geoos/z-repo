class TimeSerie extends ZDashboardElement {
    get code() {return "time-serie"}    
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
        if (!this.q) return;

        // Niveles temporalidad para drillDown
        let nivelTemporalidadQuery = nivelesTemporalidad.indexOf(this.q.temporality);
        let nivelTemporalidadVariable = nivelesTemporalidad.indexOf(this.q.variable.temporality);

        let {promise, controller} = await this.q.query({
            format:"time-serie", startTime:start.valueOf(), endTime:end.valueOf()
        })
        let data = await promise;
        data = data.map(d => {
            let row = {time:d.time}
            row.value = d.resultado;
            return row;
        })
        this.root.setThemes([am5themes_Animated.new(this.root), am5themes_Dark.new(this.root)])
        let chart = this.root.container.children.push(am5xy.XYChart.new(this.root, {panX: true, panY: true, wheelX: "panX", wheelY: "zoomX"}));
        chart.set("cursor", am5xy.XYCursor.new(this.root, {behavior: "none"}));        
        
        let baseTemporality = this.getBaseTemporality();
        this.root.dateFormatter.set("dateFormat", baseTemporality.tooltipDateFormat);
        let dateAxis = chart.xAxes.push(am5xy.DateAxis.new(this.root, {
            baseInterval: baseTemporality.baseInterval,
            renderer: am5xy.AxisRendererX.new(this.root, {}),
            tooltip: am5.Tooltip.new(this.root, {})
        }));
        let valueAxis = chart.yAxes.push(am5xy.ValueAxis.new(this.root, {
            renderer: am5xy.AxisRendererY.new(this.root, {})
        }));
        let unit;
        if (this.q.accum == "n") unit = "N°";
        else unit = this.q.variable.options?this.q.variable.options.unit:"S/U";            
        valueAxis.children.moveValue(am5.Label.new(this.root, { text: unit, rotation: -90, y: am5.p50, centerX: am5.p50 }), 0);

        let series, bullet;
        switch (this.options.serieType) {
            case "line":
            case "area":
            case "smoothed-line":
            case "smoothed-area":
                if (this.options.serieType.startsWith("smoothed-")) {
                    series = chart.series.push(am5xy.SmoothedXLineSeries.new(this.root, {
                        name:this.q.variable.name, xAxis: dateAxis, yAxis: valueAxis,
                        valueYField: "value", valueXField: "time",
                        tooltip: am5.Tooltip.new(this.root, {
                            labelText: "[bold]{name}[/]\n{valueX.formatDate()}: {valueY} [[" + unit + "]]"
                        })
                    }));
                } else {
                    series = chart.series.push(am5xy.LineSeries.new(this.root, {
                        name:this.q.variable.name, xAxis: dateAxis, yAxis: valueAxis,
                        valueYField: "value", valueXField: "time",
                        tooltip: am5.Tooltip.new(this.root, {
                            labelText: "[bold]{name}[/]\n{valueX.formatDate()}: {valueY} [[" + unit + "]]"
                        })
                    }));
                }
                if (this.options.serieType == "area") {
                    series.fills.template.setAll({fillOpacity: 0.2, visible: true});                  
                    series.strokes.template.setAll({strokeWidth: 2});
                }
                bullet = series.bullets.push(_ => {
                    let sprite = am5.Rectangle.new(this.root, {
                        width:12, height:12, 
                        centerX: am5.p50, centerY: am5.p50,
                        fill: series.get("fill")
                    });
                    if (nivelTemporalidadQuery > nivelTemporalidadVariable) {
                        sprite.set("cursorOverStyle", "crosshair");
                        sprite.events.on("click", e => {
                            setTimeout(_ => this.drilldownTime(e.target.dataItem.dataContext.time), 50);
                        })
                    }
                    let b = am5.Bullet.new(this.root, {
                        sprite
                    });
                    return b;
                }); 
                break;
            case "columns":
            case "curved-columns":
            case "rounded-columns":
                series = chart.series.push(am5xy.ColumnSeries.new(this.root, {
                    name:this.q.variable.name, xAxis: dateAxis, yAxis: valueAxis,
                    valueYField: "value", valueXField: "time",
                    sequencedInterpolation: true,
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "[bold]{name}[/]\n{valueX.formatDate()}: {valueY} [[" + unit + "]]"
                    })
                }));
                let template = series.columns.template;       
                if (this.options.serieType == "curved-columns") {
                    template.setAll({width: am5.percent(120), fillOpacity: 0.9, strokeOpacity: 0});
                    template.adapters.add("fill", (fill, target) => {return chart.get("colors").getIndex(series.columns.indexOf(target));});
                    template.adapters.add("stroke", (stroke, target) => {return chart.get("colors").getIndex(series.columns.indexOf(target));});
                    template.set("draw", (display, target) => {
                        var w = target.getPrivate("width", 0);
                        var h = target.getPrivate("height", 0);
                        display.moveTo(0, h);
                        display.bezierCurveTo(w / 4, h, w / 4, 0, w / 2, 0);
                        display.bezierCurveTo(w - w / 4, 0, w - w / 4, h, w, h);
                      });
                } else if (this.options.serieType == "rounded-columns") {
                    template.setAll({
                        cornerRadiusTL: 15,
                        cornerRadiusTR: 15,
                        width: am5.percent(70),
                        strokeOpacity: 1
                      });
                }         
                if (nivelTemporalidadQuery > nivelTemporalidadVariable) {
                    template.set("cursorOverStyle", "crosshair");
                    //template.cursorOverStyle = "crosshair";
                    template.events.on("click", e => {
                        setTimeout(_ => this.drilldownTime(e.target.dataItem.dataContext.time), 50);
                    })
                }
                break;
        }

        series.data.setAll(data);

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

        this.chart = chart;
    }

    drilldownTime(date) {
        let d = moment.tz(date, window.timeZone);
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
ZVC.export(TimeSerie);