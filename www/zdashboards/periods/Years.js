class Years extends ZCustomController {    
    onThis_init(options) {
        this.options = options;
        this.edStartYear.value = options.start.year();
        let end = options.end.clone().subtract(1, "year");
        this.edEndYear.value = end.year();
        this.valida();
    }

    onEdStartYear_change() {this.valida()}
    onEdEndYear_change() {this.valida()}
    valida() {
        let startYYYY = parseInt(this.edStartYear.value);
        let endYYYY = parseInt(this.edEndYear.value);
        if (isNaN(startYYYY) || isNaN(endYYYY)) {
            this.triggerEvent("valida", false);
            return;
        }
        this.start = moment.tz(window.timeZone);
        this.start.year(startYYYY); this.start.month(0);
        this.start.date(1); this.start.hour(0); this.start.minute(0); this.start.second(0); this.start.millisecond(0);
        this.end = moment.tz(window.timeZone);
        this.end.year(endYYYY); this.end.month(0);
        this.end.date(1); this.end.hour(0); this.end.minute(0); this.end.second(0); this.end.millisecond(0);

        this.end = this.end.clone().add(1, "year");
        console.log(this.start.format("DD/MM/YYYY HH:mm") + " al " + this.end.format("DD/MM/YYYY HH:mm"));
        this.triggerEvent("valida", (this.end > this.start));
    }
}
ZVC.export(Years);