class DataSets extends ZCustomController {
    onThis_init() {        
        this.edDataSet.setGroups(window.zrepo.dataSetsTree, "name", "dataSets");
        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                this.resizeList(entry.contentRect);
            }
        })
        this.refreshDataSet();
    }
    onThis_activated() {this.resizeObserver.observe(this.contentPane.view.parentNode)}
    onThis_deactivated() {this.resizeObserver.unobserve(this.contentPane.view.parentNode)}
    resizeList(rect) {
        this.listContainer.view.style["max-height"] = (rect.height - 110) + "px";
    }

    onEdDataSet_change() {this.refreshDataSet()}

    refreshDataSet() {
        let ds = this.edDataSet.selectedRow;
        if (!ds.imports || !ds.imports.length) {
            this.cmdUpload.hide();
        } else {
            this.cmdUpload.setRows(
                ds.imports.filter(i => (i.type == "upload")).map((i, idx) => ({idx, label:i.label}))
            )
        }
        this.refreshData();
    }

    onEdFilter_change() {this.refreshData()}

    async refreshData() {
        let ds = this.edDataSet.selectedRow;
        for (let i=0; i<20; i++) {
            if (i < ds.columns.length) {
                let th = this.find("[data-z-field='c" + (i+1) + "']")
                let col = i < ds.columns.length?ds.columns[i]:null;
                if (col) {
                    this.rowsList.showColumn(i + 1);
                    th.innerText = col.name;
                    th.className = "text-center";
                    this.rowsList.columns[i+1].cellClass = null;
                    if (col.type == "number") {
                        th.className = "text-right"
                        this.rowsList.columns[i+1].cellClass = "text-right"
                    }
                }
            } else {
                this.rowsList.hideColumn(i + 1);
            }
        }
        this.rowsList.refresh();
    }

    prepareRow(r) {        
        let ds = this.edDataSet.selectedRow;
        r.fmtTime = moment.tz(r.time, window.timeZone).format(getFormatForTemporality(ds.temporality));
        console.log("ds", ds, "row", r);
        if (!ds) return r;
        for (let i=0; i<20; i++) {
            if (i < ds.columns.length) {
                let v = r[ds.columns[i].code];
                r["c" + (i+1)] = (v && ds.columns[i].type == "number")?v.toLocaleString():v;
            }
        }
        return r;
    }

    async onRowsList_getRowsCount() {
        let n = await zPost("getDSRowsCount.zrepo", {dsCode:this.edDataSet.value})
        return n;
    }
    async onRowsList_getRowsPage(startRow, nRows) {
        let page = await zPost("getDSRows.zrepo", {dsCode:this.edDataSet.value, startRow, nRows})
        return page.map(r => this.prepareRow(r));
    }

    onCmdUpload_change() {
        let ds = this.edDataSet.selectedRow;
        let dsImport = ds.imports[this.cmdUpload.value];
        this.showDialog("./WUploadDSFile", {ds:ds, dsImport:dsImport}, _ => this.refreshDataSet(), _ => this.refreshDataSet())
    }
}
ZVC.export(DataSets);