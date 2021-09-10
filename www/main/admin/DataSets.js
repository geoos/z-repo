class DataSets extends ZCustomController {
    onThis_init() {
        this.edDesde.value = new Date();
        this.edHasta.value = new Date();
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
        let imports = ds.imports || [];
        let uploads = imports.filter(i => i.type == "upload");
        if (!uploads.length) {
            $(this.cmdUpload.view).parent().hide();
        } else {
            $(this.cmdUpload.view).parent().show();
            this.cmdUpload.setRows(
                uploads.map((i, idx) => ({idx, label:i.label}))
            )
        }
        let syncs = imports.filter(i => i.type == "sync");        
        if (syncs.length) {
            this.cmdSync.show();
            this.find("#syncLabel").innerText = syncs[0].label;
        } else {
            this.cmdSync.hide();
        }
        this.refreshData();
    }

    onEdFilter_change() {this.refreshData()}

    async refreshData() {
        let ds = this.edDataSet.selectedRow;
        if (ds.temporality == "none") {
            this.rowsList.hideColumn(0);
        } else {
            this.rowsList.showColumn(0);
        }
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

    onEdDesde_change() {this.rowsList.refresh()}
    onEdHasta_change() {this.rowsList.refresh()}
    onEdFilter_change() {this.rowsList.refresh()}

    prepareRow(r) {        
        let ds = this.edDataSet.selectedRow;
        if (ds.temporality != "none") {
            r.fmtTime = moment.tz(r.time, window.timeZone).format(getFormatForTemporality(ds.temporality));
        }
        if (!ds) return r;
        for (let i=0; i<20; i++) {
            if (i < ds.columns.length) {
                let v = r[ds.columns[i].code];
                r["c" + (i+1)] = (v && ds.columns[i].type == "number")?v.toLocaleString():v;
            }
        }
        return r;
    }

    getTimeFilters() {
        let d0 = this.edDesde.value.startOf("day");
        let d1 = this.edDesde.value.endOf("day");
        return {fromTime:d0.valueOf(), toTime:d1.valueOf()};
    }
    async onRowsList_getRowsCount() {
        let time = this.getTimeFilters();
        let n = await zPost("getDSRowsCount.zrepo", {dsCode:this.edDataSet.value, fromTime:time.fromTime, toTime:time.toTime, filter:this.edFilter.value})
        return n;
    }
    async onRowsList_getRowsPage(startRow, nRows) {
        let time = this.getTimeFilters();
        let page = await zPost("getDSRows.zrepo", {dsCode:this.edDataSet.value, startRow, nRows, fromTime:time.fromTime, toTime:time.toTime, filter:this.edFilter.value})
        return page.map(r => this.prepareRow(r));
    }

    onCmdUpload_change() {
        let ds = this.edDataSet.selectedRow;
        let dsImport = ds.imports[this.cmdUpload.value];
        this.showDialog("./WUploadDSFile", {ds:ds, dsImport:dsImport}, _ => this.refreshDataSet(), _ => this.refreshDataSet())
    }

    onCmdSync_click() {
        let ds = this.edDataSet.selectedRow;
        let importIndex = ds.imports.findIndex(i => i.type == "sync");
        zPost("syncDataSet.zrepo", {dsCode:ds.code, importIndex});
        this.showDialog("common/WInfo", {message:"Sincronización corriendo en segundo plano. Refresque los datos para ver el progreso"});
    }
}
ZVC.export(DataSets);