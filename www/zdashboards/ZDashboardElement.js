class ZDashboardElement extends ZCustomController {
    get code() {throw "get code() no se sobreescribió"}

    get chartContainerId() {return "chartContainer-" + this.zId}
    get chartContainer() {return this.find("#" + this.chartContainerId)}
    get root() {
        if (this._root) return this._root;
        this._root = am5.Root.new(this.chartContainerId);
        this._root.locale = am5locales_es_ES;
        return this._root;
    }

    onThis_deactivated() {
        if (this.chart) {
            this.chart.dispose();
            this.chart = null;
        }
    }
    doResize() {
        if (this._root) {
            this._root.resize();
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
    dispose() {
        if (this._root) {
            this._root.dispose();
            this._root = null;
        }
    }
}