class TimeSerie extends ZCustomController {
    get code() {return "time-serie"}
    onThis_init() {
        this.options = {serieType:"area"};
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
    setOption(opt, value) {
        this.options[opt] = value;
    }
    asDate(row) {
        let l = row.localTime;
        return new Date(l.year, l.month-1, l.day, l.hour, l.minute);
    }
    adjustTemporality(dateAxis) {
        if (this.q.temporality == "1d") {
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
        }
    }
    async refresh(start, end) {
        if (this.chart) {
            this.chart.dispose();
            this.chart = null;
        }
        if (!this.q) return;
        am4core.useTheme(am4themes_dark);
        am4core.useTheme(am4themes_animated);
        let chart = am4core.create("chartContainer", am4charts.XYChart);

        let {promise, controller} = await this.q.query({
            format:"time-serie", startTime:start.valueOf(), endTime:end.valueOf()
        })
        let data = await promise;
        //console.log("data1", this.q.accum, data);
        data = data.map(d => {
            let row = {time:this.asDate(d)}
            row[this.q.accum] = d[this.q.accum];
            return row;
        })
        //console.log("data2", data);
        chart.data = data;
        
        let dateAxis = chart.xAxes.push(new am4charts.DateAxis());
        this.adjustTemporality(dateAxis);
        let valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        //valueAxis.tooltip.disabled = true;
        if (this.q.accum == "n") {
            valueAxis.title.text = "N°";
        } else {
            valueAxis.title.text = this.q.variable.options.unit;
        }        

        let series;
        switch (this.options.serieType) {
            case "line":
                series = chart.series.push(new am4charts.LineSeries());
                break;
            case "area":
                series = chart.series.push(new am4charts.LineSeries());
                series.fillOpacity = 0.3;
                break;
            case "columns":
                series = chart.series.push(new am4charts.ColumnSeries());
                series.fillOpacity = 0.7;
                break;
        }
        series.dataFields.dateX = "time";
        series.dataFields.valueY = this.q.accum;
        series.tooltipText = this.q.variable.name + ": [bold]{valueY}[/]";
       
        chart.cursor = new am4charts.XYCursor();
        chart.cursor.lineY.opacity = 0;
        chart.scrollbarX = new am4charts.XYChartScrollbar();
        chart.scrollbarX.series.push(series);

        dateAxis.start = 0.0;
        dateAxis.keepSelection = true;

        this.chart = chart;
    }
}
ZVC.export(TimeSerie);