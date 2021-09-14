class Months extends ZCustomController {    
    onThis_init(options) {
        let rows = {
            "1M":["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
            "3M":["ene-mar", "abr-jun", "jul-sep", "oct-dic"],
            "4M":["ene-abr", "may-ago","sep-dic"],
            "6M":["ene-jun", "jul-dic"]
        }
        this.options = options;
        let periods = rows[options.temporality].map((r, idx) => ({code:idx, name:r}));
        this.edStartMonth.setRows(periods, this.getPeriodoDeFecha(options.start));
        this.edStartYear.value = options.start.year();
        let end = options.end.clone().subtract(this.getNMeses(), "months");
        this.edEndMonth.setRows(periods, this.getPeriodoDeFecha(end));
        this.edEndYear.value = end.year();
        this.valida();
    }

    getNMeses() {
        switch(this.options.temporality) {
            case "1M": return 1;
            case "3M": return 3;
            case "4M": return 4;
            case "6M": return 6;
        }
    }
    getPeriodoDeFecha(d) {
        return parseInt(d.month() / this.getNMeses());
    }
    getMesDePeriodo(p) {
        return p * this.getNMeses();       
    }

    onEdStartMonth_change() {this.valida()}
    onEdStartYear_change() {this.valida()}
    onEdEndMonth_change() {this.valida()}
    onEdEndYear_change() {this.valida()}
    valida() {
        let startYYYY = parseInt(this.edStartYear.value);
        let endYYYY = parseInt(this.edEndYear.value);
        if (isNaN(startYYYY) || isNaN(endYYYY)) {
            this.triggerEvent("valida", false);
            return;
        }
        this.start = moment.tz(window.timeZone);
        this.start.year(startYYYY); this.start.month(this.getMesDePeriodo(this.edStartMonth.value));
        this.start.date(1); this.start.hour(0); this.start.minute(0); this.start.second(0); this.start.millisecond(0);
        this.end = moment.tz(window.timeZone);
        this.end.year(endYYYY); this.end.month(this.getMesDePeriodo(this.edEndMonth.value));
        this.end.date(1); this.end.hour(0); this.end.minute(0); this.end.second(0); this.end.millisecond(0);

        this.end = this.end.clone().add(this.getNMeses(), "months");
        this.triggerEvent("valida", (this.end > this.start));
    }
}
ZVC.export(Months);