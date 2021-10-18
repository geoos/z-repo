class Hours extends ZCustomController {
    onThis_init(options) {
        this.options = options;
        const rowsInicio = {
             "5m":["00:00", "05:00", "10:00", "15:00", "20:00", "25:00", "30:00", "35:00", "40:00", "45:00", "50:00", "55:00"],
            "15m":["00:00", "15:00", "30:00", "45:00"],
            "30m":["00:00", "30:00"],
            "1h":["00:00"]
        };
        const rowsFin = {
            "5m":["04:59", "09:59", "14:59", "19:59", "24:59", "29:59", "34:59", "39:59", "44:59", "49:59", "54:59", "59:59"],
           "15m":["14:59", "29:59", "44:59", "59:59"],
           "30m":["29:59", "59:59"],
           "1h":["59:59"]
        };
        this.edStartDate.value = this.onlyDate(options.start);
        let bloquesStart = rowsInicio[options.temporality].map((r, idx) => ({code:idx, name:r}));
        this.edStartHour.value = options.start.hours();
        this.edStartMinute.setRows(bloquesStart, this.getFilaMinutos(options.start))

        let end = options.end.clone().subtract(this.getNMinutos(), "minutes");
        this.edEndDate.value = this.onlyDate(end);
        let bloquesEnd = rowsFin[options.temporality].map((r, idx) => ({code:idx, name:r}));
        this.edEndHour.value = end.hours();
        console.log("end", end.format("DD/MM/YYYY HH:mm"), this.getFilaMinutos(end))
        this.edEndMinute.setRows(bloquesEnd, this.getFilaMinutos(end))
        this.valida();
    }
    onlyDate(date) {
        let d = date.clone();
        d.hours(0); d.minutes(0); d.second(0); d.milliseconds(0);
        return d;
    }
    getNMinutos() {
        switch(this.options.temporality) {            
            case "5m":  return 5;
            case "15m": return 15;
            case "30m": return 30;
            case "1h":  return 60;
        }
    }
    getFilaMinutos(d) {
        return parseInt(d.minutes() / this.getNMinutos());
    }
    onEdStartDate_change() {this.valida()}
    onEdStartHour_change() {this.valida()}
    onEdStartMinute_change() {this.valida()}
    onEdEndDate_change() {this.valida()}
    onEdEndHour_change() {this.valida()}
    onEdEndMinute_change() {this.valida()}

    valida() {
        this.start = this.edStartDate.value.clone();
        let startHH = this.edStartHour.value;
        if (isNaN(startHH) || startHH < 0 || startHH > 23) {
            this.triggerEvent("valida", false);    
        }
        this.start = this.start.add(startHH, "hours");
        this.start = this.start.add(this.getNMinutos() * this.edStartMinute.value, "minutes");

        this.end = this.edEndDate.value.clone();
        let endHH = this.edEndHour.value;
        if (isNaN(endHH) || endHH < 0 || endHH > 23) {
            this.triggerEvent("valida", false);    
        }
        this.end = this.end.add(endHH, "hours");
        this.end = this.end.add(this.getNMinutos() * (this.edEndMinute.value + 1), "minutes");        
        this.triggerEvent("valida", (this.end > this.start));
    }
}

ZVC.export(Hours);