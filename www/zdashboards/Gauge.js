class Gauge extends ZDashboardElement {
    get code() {return "gauge"}
    onThis_init() {
    }
    async refresh(start, end) {
        try {
            if (this.chart) {
                this.chart.dispose();
                this.chart = null;
            }            
            if (!this.q) return;            
            let {promise, controller} = await this.q.query({
                format:"period-summary", startTime:start.valueOf(), endTime:end.valueOf()
            });
            let data = await promise;
            console.log("data", data);

            let scale = this.options.scale;

            am4core.useTheme(am4themes_dark);
            am4core.useTheme(am4themes_animated);     
            let chart = am4core.create(this.chartContainerId, am4charts.GaugeChart);

            chart.hiddenState.properties.opacity = 0;
            chart.fontSize = 11 * scale;
            chart.innerRadius = am4core.percent(80);
            chart.resizable = true;

            let axis = chart.xAxes.push(new am4charts.ValueAxis());
            axis.min = this.options.min;
            axis.max = this.options.max;
            axis.strictMinMax = true;
            axis.renderer.radius = am4core.percent(75);
            axis.renderer.inside = true;
            axis.renderer.line.strokeOpacity = 0.1;
            axis.renderer.ticks.template.disabled = false;
            axis.renderer.ticks.template.strokeOpacity = 1;
            axis.renderer.ticks.template.strokeWidth = 0.5;
            axis.renderer.ticks.template.length = 5 * scale;
            axis.renderer.grid.template.disabled = true;
            axis.renderer.labels.template.radius = am4core.percent(15);
            axis.renderer.labels.template.fontSize = (1.3 * scale) + "em";

            // Axis for ranges
            let axis2 = chart.xAxes.push(new am4charts.ValueAxis());
            axis2.min = this.options.min;
            axis2.max = this.options.max;
            axis2.strictMinMax = true;
            axis2.renderer.labels.template.disabled = true;
            axis2.renderer.ticks.template.disabled = true;
            axis2.renderer.grid.template.disabled = false;
            axis2.renderer.grid.template.opacity = 0.5;
            axis2.renderer.labels.template.bent = true;
            axis2.renderer.labels.template.fill = am4core.color("#000");
            axis2.renderer.labels.template.fontWeight = "bold";
            axis2.renderer.labels.template.fillOpacity = 0.3;

            let ranges = [{fromValue:this.options.min, color:this.options.firstColor, label:this.options.firstLabel}];
            for (let r of this.options.ranges) {
                let r2 = ranges[ranges.length - 1];
                r2.toValue = r.value;
                ranges.push({fromValue:r.value, color:r.color, label:r.label});
            }
            ranges[ranges.length - 1].toValue = this.options.max;
            
            for (let r of ranges) {
                var range = axis2.axisRanges.create();
                range.axisFill.fill = am4core.color(r.color);
                range.axisFill.fillOpacity = 0.8;
                range.axisFill.zIndex = -1;
                range.value = r.fromValue > this.options.min ? r.fromValue : this.options.min;
                range.endValue = r.toValue < this.options.max ? r.toValue : this.options.max;
                range.grid.strokeOpacity = 0;
                range.stroke = am4core.color(r.color).lighten(-0.2);
                range.label.inside = true;
                if (r.label) range.label.text = r.label;
                range.label.inside = true;
                range.label.location = 0.5;
                range.label.inside = true;
                range.label.radius = am4core.percent(10);
                range.label.paddingBottom = -5 * scale;
                range.label.fontSize = (1.7 * scale) + "em";
                range.label.fill = "black";
            }

            let label2 = chart.radarContainer.createChild(am4core.Label);
            label2.isMeasured = false;
            label2.fontSize = (2 * scale) + "em";
            label2.x = am4core.percent(50);
            label2.paddingBottom = 55 * scale;
            label2.horizontalCenter = "middle";
            label2.verticalCenter = "bottom";
            label2.text = this.q.variable.options?this.q.variable.options.unit:"S/U";

            let label = chart.radarContainer.createChild(am4core.Label);
            label.isMeasured = false;
            label.fontSize = (4 * scale) + "em";
            label.horizontalCenter = "middle";
            label.verticalCenter = "bottom";
            if (data === null || isNaN(data)) {
                label.text = "S/D";
            } else {            
                label.text = data.toFixed(1);
            }

           if (data !== null && !isNaN(data)) {
                let hand = chart.hands.push(new am4charts.ClockHand());
                hand.axis = axis2;
                hand.innerRadius = am4core.percent(50);
                hand.radius = am4core.percent(95);
                hand.startWidth = 8 * scale;
                hand.pin.disabled = true;
                let v = data;
                v = v<this.options.min?this.options.min:v;
                v = v>this.options.max?this.options.max:v;
                hand.value = v;
                //hand.fill = am4core.color("#444");
                hand.stroke = am4core.color("#000");
            }

            this.chart = chart;
        } catch(error) {
            console.error(error);
        }
    }

}
ZVC.export(Gauge);