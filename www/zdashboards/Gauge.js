class Gauge extends ZDashboardElement {
    get code() {return "gauge"}
    onThis_init() {
    }
    async refresh(start, end) {
        try {
            this.dispose();
            if (!this.q) return;            
            let {promise, controller} = await this.q.query({
                format:"period-summary", startTime:start.valueOf(), endTime:end.valueOf()
            });
            let data = await promise;
            console.log("data", data);

            let scale = this.options.scale;

            this.root.setThemes([am5themes_Animated.new(this.root), am5themes_Dark.new(this.root)]);
            let chart = this.root.container.children.push(am5radar.RadarChart.new(this.root, {
                panX: false, panY: false, startAngle: 160,endAngle: 380
            }));
            let axisRenderer = am5radar.AxisRendererCircular.new(this.root, {innerRadius: -40});
            axisRenderer.grid.template.setAll({
                stroke: this.root.interfaceColors.get("background"),
                visible: true,
                strokeOpacity: 0.8
            });

            let xAxis = chart.xAxes.push(am5xy.ValueAxis.new(this.root, {
                maxDeviation: 0,
                min: this.options.min,
                max: this.options.max,
                strictMinMax: true,
                renderer: axisRenderer
            }));

            let axisDataItem = xAxis.makeDataItem({});
            let clockHand = am5radar.ClockHand.new(this.root, {pinRadius: am5.percent(20), radius: am5.percent(100), bottomWidth: 40})
            let bullet = axisDataItem.set("bullet", am5xy.AxisBullet.new(this.root, {sprite: clockHand}));
            xAxis.createAxisRange(axisDataItem);

            let label = chart.radarContainer.children.push(am5.Label.new(this.root, {
                fill: am5.color(0xffffff),
                centerX: am5.percent(50),
                textAlign: "center",
                centerY: am5.percent(50),
                fontSize: "3em"
            }));

            axisDataItem.set("value", this.options.min);
            bullet.get("sprite").on("rotation", _ => {
                let value = axisDataItem.get("value");
                let fill = am5.color(0x000000);
                xAxis.axisRanges.each(axisRange => {
                    if (value >= axisRange.get("value") && value <= axisRange.get("endValue")) {
                        fill = axisRange.get("axisFill").get("fill");
                    }
                })
                label.set("text", Math.round(value).toString());

                clockHand.pin.animate({ key: "fill", to: fill, duration: 500, easing: am5.ease.out(am5.ease.cubic) })
                clockHand.hand.animate({ key: "fill", to: fill, duration: 500, easing: am5.ease.out(am5.ease.cubic) })
            });
            chart.bulletsContainer.set("mask", undefined);


            /*
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
            */

            // Axis for ranges
            /*
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
            */

            let ranges = [{fromValue:this.options.min, color:this.options.firstColor, label:this.options.firstLabel}];
            for (let r of this.options.ranges) {
                let r2 = ranges[ranges.length - 1];
                r2.toValue = r.value;
                ranges.push({fromValue:r.value, color:r.color, label:r.label});
            }
            ranges[ranges.length - 1].toValue = this.options.max;
            
            for (let r of ranges) {
                var axisRange = xAxis.createAxisRange(xAxis.makeDataItem({}));
                axisRange.setAll({value: r.fromValue, endValue: r.toValue});
                axisRange.get("axisFill").setAll({visible: true, fill: am5.color(r.color), fillOpacity: 0.8});                
                axisRange.get("label").setAll({text: r.label, inside: true, radius: 15, fontSize: "0.9em", fill: this.root.interfaceColors.get("background")}); // * scale
                /*
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
                */
            }

            /*
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
            */

            axisDataItem.animate({
                key: "value",
                to: data,
                duration: 500,
                easing: am5.ease.out(am5.ease.cubic)
            });

            this.chart = chart;
        } catch(error) {
            console.error(error);
        }
    }

}
ZVC.export(Gauge);