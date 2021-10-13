class TimeSerie extends ZDashboardElement {
    get code() {return "time-serie"}
    onThis_init() {
    }
    
    asDate(row) {
        let l = row.localTime;
        return new Date(l.year, l.month-1, l.day, l.hour, l.minute);
    }
    adjustTemporality(dateAxis) {
        if (this.q.temporality == "5m") {
            dateAxis.baseInterval = {
                "timeUnit": "minute",
                "count": 5
            };
            dateAxis.tooltipDateFormat = "dd/MMM/yyyy HH:mm";            
        } else if (this.q.temporality == "15m") {
            dateAxis.baseInterval = {
                "timeUnit": "minute",
                "count": 15
            };
            dateAxis.tooltipDateFormat = "dd/MMM/yyyy HH:mm";            
        } else if (this.q.temporality == "30m") {
            dateAxis.baseInterval = {
                "timeUnit": "minute",
                "count": 30
            };
            dateAxis.tooltipDateFormat = "dd/MMM/yyyy HH:mm";            
        } else if (this.q.temporality == "1h") {
            dateAxis.baseInterval = {
                "timeUnit": "hour",
                "count": 1
            };
            dateAxis.tooltipDateFormat = "dd/MMM/yyyy HH:mm";            
        } else if (this.q.temporality == "1d") {
            dateAxis.baseInterval = {
                "timeUnit": "day",
                "count": 1
            };
            dateAxis.tooltipDateFormat = "dd/MMM/yyyy";            
        } else if (this.q.temporality == "1M") {
            dateAxis.baseInterval = {
                "timeUnit": "month",
                "count": 1
            };
            dateAxis.tooltipDateFormat = "MMM/yyyy";            
        } else if (this.q.temporality == "3M") {
            dateAxis.baseInterval = {
                "timeUnit": "month",
                "count": 3
            };
            dateAxis.tooltipDateFormat = "MMM/yyyy";            
        } else if (this.q.temporality == "4M") {
            dateAxis.baseInterval = {
                "timeUnit": "month",
                "count": 4
            };
            dateAxis.tooltipDateFormat = "MMM/yyyy";            
        } else if (this.q.temporality == "6M") {
            dateAxis.baseInterval = {
                "timeUnit": "month",
                "count": 12
            };
            dateAxis.tooltipDateFormat = "MMM/yyyy";            
        } else if (this.q.temporality == "1Y") {
            dateAxis.baseInterval = {
                "timeUnit": "year",
                "count": 1
            };
            dateAxis.tooltipDateFormat = "yyyy";            
        }
    }
    async refresh(start, end, operation = "refresh") {
        if (operation == "refresh") this.drillStack = [];
        this.start = start;
        this.end = end;

        if (this.chart) {
            await this.chart.dispose();
            this.chart = null;
        }
        if (!this.q) return;

        // Niveles temporalidad para drillDown
        let nivelTemporalidadQuery = nivelesTemporalidad.indexOf(this.q.temporality);
        let nivelTemporalidadVariable = nivelesTemporalidad.indexOf(this.q.variable.temporality);

        let {promise, controller} = await this.q.query({
            format:"time-serie", startTime:start.valueOf(), endTime:end.valueOf()
        })
        let data = await promise;
        //console.log("data1", this.q.accum, data);
        data = data.map(d => {
            let row = {time:this.asDate(d)}
            //row[this.q.accum] = d[this.q.accum];
            row.value = d.resultado;
            return row;
        })
        //console.log("data2", data);
        am4core.useTheme(am4themes_dark);
        am4core.useTheme(am4themes_animated);
        let is3d = this.options.serieType == "3d-columns" || this.options.serieType == "3d-cylinders";
        let chart;
        if (is3d) {
            chart = am4core.create(this.chartContainerId, am4charts.XYChart3D);
        } else {
            chart = am4core.create(this.chartContainerId, am4charts.XYChart);
        }
        chart.data = data;
        
        let dateAxis = chart.xAxes.push(new am4charts.DateAxis());
        this.adjustTemporality(dateAxis);
        let valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        //valueAxis.tooltip.disabled = true;
        if (this.q.accum == "n") {
            valueAxis.title.text = "N°";
        } else {
            valueAxis.title.text = this.q.variable.options?this.q.variable.options.unit:"S/U";
        }        

        let series, bullet, square;
        switch (this.options.serieType) {
            case "line":
                series = chart.series.push(new am4charts.LineSeries());
                bullet = series.bullets.push(new am4charts.Bullet());                
                square = bullet.createChild(am4core.Rectangle);
                square.width = 10;
                square.height = 10;
                square.horizontalCenter = "middle";
                square.verticalCenter = "middle";
                if (nivelTemporalidadQuery > nivelTemporalidadVariable) {
                    bullet.cursorOverStyle = am4core.MouseCursorStyle.pointer;
                    bullet.events.on("hit", e => {
                        setTimeout(_ => this.drilldownTime(e.target.dataItem.dataContext.time), 50);
                    })
                }                
                break;
            case "area":
                series = chart.series.push(new am4charts.LineSeries());
                series.fillOpacity = 0.3;
                bullet = series.bullets.push(new am4charts.Bullet());
                square = bullet.createChild(am4core.Rectangle);
                square.width = 10;
                square.height = 10;
                square.horizontalCenter = "middle";
                square.verticalCenter = "middle";
                if (nivelTemporalidadQuery > nivelTemporalidadVariable) {
                    bullet.cursorOverStyle = am4core.MouseCursorStyle.pointer;
                    bullet.events.on("hit", e => {
                        setTimeout(_ => this.drilldownTime(e.target.dataItem.dataContext.time), 50);
                    })
                }                
                break;
            case "columns":
            case "triangles":
            case "3d-cylinders":
                if (this.options.serieType == "triangles") {
                    series = chart.series.push(new am4charts.CurvedColumnSeries());
                    series.columns.template.strokeOpacity = 0;
                    series.columns.template.tension = 1;
                } else if (this.options.serieType == "3d-cylinders") {
                    series = chart.series.push(new am4charts.ConeSeries());
                } else {
                    series = chart.series.push(new am4charts.ColumnSeries());
                }
                if (nivelTemporalidadQuery > nivelTemporalidadVariable) {
                    series.columns.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;
                    series.columns.template.events.on("hit", e => {
                        setTimeout(_ => this.drilldownTime(e.target.dataItem.dataContext.time), 50);
                    })
                }
                series.fillOpacity = 0.7;
                break;
            case "3d-columns":
                series = chart.series.push(new am4charts.ColumnSeries3D());
                if (nivelTemporalidadQuery > nivelTemporalidadVariable) {
                    series.columns.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;
                    series.columns.template.events.on("hit", e => {
                        setTimeout(_ => this.drilldownTime(e.target.dataItem.dataContext.time), 50);
                    })
                }
                series.fillOpacity = 0.7;
                break;
        }
        series.dataFields.dateX = "time";
        //series.dataFields.valueY = this.q.accum;
        series.dataFields.valueY = "value";
        series.tooltipText = this.q.variable.name + ": [bold]{valueY}[/]";
       
        chart.cursor = new am4charts.XYCursor();
        chart.cursor.lineY.opacity = 0;
        if (this.options.zoomTiempo) {
            chart.scrollbarX = new am4charts.XYChartScrollbar();
            chart.scrollbarX.series.push(series);
        }

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

        this.chart = chart;
    }

    drilldownTime(date) {
        let d = moment.tz(window.timeZone);
        d.year(date.getFullYear()); d.month(date.getMonth()); d.date(date.getDate());
        d.hour(date.getHours()); d.minute(date.getMinutes()); d.seconds(0); d.millisecond(0);
        console.log("drillDown to ", d.format("DD/MM/YYYY HH:mm:ss"));
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