class TimeDim extends ZDashboardElement {
    get code() {return "time-dim"}
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

        if (!this.q || !this.options.ruta) return;   
        
        // Niveles temporalidad para drillDown
        let nivelTemporalidadQuery = nivelesTemporalidad.indexOf(this.q.temporality);
        let nivelTemporalidadVariable = nivelesTemporalidad.indexOf(this.q.variable.temporality);

        if (operation == "refresh") {
            this.q.groupingDimension = this.options.ruta;
        } // else viene en la query de los drills down/up
        let {promise, controller} = await this.q.query({
            format:"time-dim", startTime:start.valueOf(), endTime:end.valueOf()
        });
        let canDrillDown = this.q.groupingDimension.indexOf(".") > 0;
        let data = await promise;
        console.log("data", data);

        data = data.sort((d1, d2) => (d1.dim.order - d2.dim.order));
        data = data.map(d => ({
            time:this.asDate(d),
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

        Object.keys(categorias).forEach(codigo => {
            let series = chart.series.push(new am4charts.ColumnSeries());
            series.dataFields.valueY = codigo;
            series.dataFields.dateX = "time";
            series.name = categorias[codigo];
        })
        console.log("data2", data);
        chart.data = data;        

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
ZVC.export(TimeDim);