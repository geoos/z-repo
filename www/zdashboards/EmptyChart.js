class EmptyChart extends ZCompoundController {
    get code() {return "empty"}
    doResize(w, h) {}
    setQuery(q) {this.q = q}
    setOptions(opts) {this.options = opts;}
    async refresh(start, end) {}
}
ZVC.export(EmptyChart);