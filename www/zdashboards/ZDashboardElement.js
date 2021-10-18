class ZDashboardElement extends ZCustomController {
    get code() {throw "get code() no se sobreescribió"}

    get chartContainerId() {return "chartContainer-" + this.zId}
    get chartContainer() {return this.find("#" + this.chartContainerId)}

    onThis_deactivated() {
        if (this.chart) {
            this.chart.dispose();
            this.chart = null;
        }
    }
    doResize() {
        if (this.chart) {
            this.chart.invalidate();
        }
    }
    setQuery(q) {
        this.q = q;
    }
    setOptions(opts) {
        this.options = opts;
    }

    async refresh(start, end, operation = "refresh") {
        throw "No se sobreescribió refresh()"
    }
}