class DimValSelector extends ZCustomController{
    async onThis_init(options) {
        this.classifier = options.classifier;
        let label = this. view.getAttribute("data-z-label");
        if (label) {
            this.label.text = label;
        }
        let n = await zPost("getRowsCount.zrepo", {dimCode:this.classifier.dimensionCode})
        console.log("nRows", n);
        //if (n <= 100) {
            this.usingSelect = true;
            let rows = await zPost("getRows.zrepo", {dimCode:this.classifier.dimensionCode})
            this.edSelect.setRows(rows, options.value);
        //}
    }

    get value() {
        if (this.usingSelect) return this.edSelect.value;
    }
    set value(v) {
        if (this.usingSelect) this.edSelect.value = v;
    }
} 
ZVC.export(DimValSelector)