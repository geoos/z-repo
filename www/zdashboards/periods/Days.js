class Days extends ZCustomController {
    onThis_init(options) {
        this.edStart.value = options.start;
        this.edEnd.value = options.end.clone().subtract(1, "day");
        this.valida();
    }
    onEdStart_change() {this.valida()}
    onEdEnd_change() {this.valida()}
    valida() {
        this.start = this.edStart.value;
        this.end = this.edEnd.value.clone().add(1, "day");
        this.triggerEvent("valida", (this.end > this.start));
    }
}
ZVC.export(Days);