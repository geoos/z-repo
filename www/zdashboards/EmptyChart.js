class EmptyChart extends ZCompoundController {
    get code() {return "empty"}
    doResize(w, h) {}
    setQuery(q) {this.q = q}
    setOption(opt, value) {}
    async refresh(start, end) {}
}
ZVC.export(EmptyChart);