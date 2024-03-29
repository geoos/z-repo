class Dimensions extends ZCustomController {
    onThis_init() {
        this.edDimension.setGroups(window.zrepo.dimensionsTree, "name", "dimensions");
        this.refreshOptions();
        this.refresh();
        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                this.resizeList(entry.contentRect);
            }
        })
        this.edExtraData.view.addEventListener("keydown", function(e) {
            if (e.key == 'Tab') {
                e.preventDefault();
                var start = this.selectionStart;
                var end = this.selectionEnd;
            
                // set textarea value to: text before caret + tab + text after caret
                this.value = this.value.substring(0, start) + "\t" + this.value.substring(end);
            
                // put caret at right position again
                this.selectionStart = this.selectionEnd = start + 1;
              }
        })
    }

    onThis_activated() {this.resizeObserver.observe(this.contentPane.view.parentNode)}
    onThis_deactivated() {this.resizeObserver.unobserve(this.contentPane.view.parentNode)}

    resizeList(rect) {
        this.listContainer.view.style["max-height"] = (rect.height - 110) + "px";
    }

    get dimension() {return this.edDimension.selectedRow}
    
    refresh() {
        this.rowDetails.hide();
        this.rowsList.refresh();
    }

    async onEdDimension_change() {
        this.refreshOptions();
        this.refresh()
    }

    refreshOptions() {        
        let dim = this.edDimension.selectedRow;
        if (!dim) return;
        if (!dim.sync) {
            this.cmdSync.hide();
        } else {
            this.cmdSync.show();
        }
        this.minzQuery = new MinZQuery(window.zRepoClient, dim);
        this.refreshFilters();
    }

    async refreshFilters() {
        if (!this.minzQuery) {            
            this.filtro.html = "";
            return;
        }
        await this.minzQuery.construyeDescripcionFiltros();
        let desc = this.minzQuery.descripcionFiltros.map(f => (f.etiqueta)).join(" y ");
        this.filtro.text = desc || "Filtrar"
    }

    onEdTextFilter_change() {this.refresh()}

    onFiltro_click() {
        this.showDialog("common/WMinZFilters", {consulta:this.minzQuery}, q => {
            this.minzQuery = q;
            this.refreshFilters();
            this.refresh();
        })
    }

    onCmdSync_click() {
        let msg = "?";
        let sync = this.edDimension.selectedRow.sync;
        if (sync.type == "geojson") {
            msg = "¿Confirma que desea sincronizar los valores de '" + this.edDimension.selectedRow.name + "' con los publicados en el recurso GeoJSON en '" + sync.url + "'?";
        }
        this.showDialog("common/WConfirm", {message:msg}, _ => this.doSync())
    }
    doSync() {
        this.cmdSync.hide();
        this.cmdAdd.hide();
        this.lblDetailsCaption.text = "Ejecutando Sincronización";
        this.detailsContainer.html = "<div><i class='fas fa-spin fa-spinner fa-lg mr-2'></i>Sincronizando ...</div>";
        this.rowDetails.show();
        zPost("syncDimension.zrepo", {dimCode:this.edDimension.value})
            .then( _ => {
                console.log("sinc finished");
                this.refresh()    
            })
            .catch(error => {
                this.showDialog("common/WError", {message:error.toString()})
            })
            .finally(_ => {
                this.rowDetails.hide();
                this.cmdSync.show();
                this.cmdAdd.show();
            })
    }
    
    async onRowsList_getRowsCount() {
        if (!this.minzQuery) return 0;
        let textFilter = this.edTextFilter.value.trim();
        //let n = await zPost("getRowsCount.zrepo", {dimCode:this.dimension.code})
        let n = await this.minzQuery.query({format:"dim-rows-count", textFilter});
        return n;
    }
    async onRowsList_getRowsPage(startRow, nRows) {        
        //let page = await zPost("getRows.zrepo", {dimCode:this.dimension.code, startRow, nRows})
        let textFilter = this.edTextFilter.value.trim();
        let page = await this.minzQuery.query({format:"dim-rows", textFilter, startRow, nRows});
        return page;
    }
    async onCmdAdd_click() {
        await this.rowsList.openNewDetails(
            "./EdDimRow", {
                dimension:this.edDimension.selectedRow,
                newRecord:true
            }
        );
    }
    onRowsList_getDetailsConfig(row, rowIndex) {
        return {
            path:"./EdDimRow",
            options:{
                dimension:this.edDimension.selectedRow,
                record:row
            }
        }
    }

    async onRowsList_cancel(row, rowIndex) {
        await this.rowsList.closeDetails(rowIndex);
    }
    async onRowsList_saved(row, rowIndex, changedeRecord) {
        await this.rowsList.closeDetails(rowIndex);
        this.refresh();
    }
    async onRowsList_deleted(row, rowIndex) {
        await this.rowsList.closeDetails(rowIndex);      
        this.refresh();
    }

    async onRowsList_change(row, rowIndex) {
        if (rowIndex < 0) {
            this.rowDetails.hide();
            return;
        }
        this.rowDetails.show();
        this.lblDetailsCaption.text = "[" + row.code + "] " + row.name;
        let rowWithDeps = await zPost("getRowWithDependencies.zrepo", {dimCode:this.edDimension.value, code:row.code});
        let html = this.buildDetailsTree(this.edDimension.selectedRow, rowWithDeps, 0);
        this.detailsContainer.html = html;
        let dim = this.edDimension.selectedRow;
        let extraData = {};
        for (let field in row) {
            if (field != "_id" && field != "code" && field != "name" && field != "order") {
                if (dim.classifiers.findIndex(c => (c.fieldName == field)) < 0) {
                    extraData[field] = row[field];
                }
            }
        }
        this.edExtraData.value = JSON.stringify(extraData, null, 4);
        this.cmdSaveExtraData.disable();
    }
    onEdExtraData_change() {
        let j;
        try {
            j = JSON.parse(this.edExtraData.value);
        } catch(err) {
            this.cmdSaveExtraData.disable();
            return;
        }
        this.cmdSaveExtraData.enable();
    }
    async onCmdSaveExtraData_click() {
        let j = JSON.parse(this.edExtraData.value);
        let row = this.rowsList.getSelectedRow();
        console.log("row", row);
        let dim = this.edDimension.selectedRow;
        let newRow = {_id:row._id, code:row.code, name:row.name}
        dim.classifiers.forEach(c => newRow[c.fieldName] = row[c.fieldName]);
        for (let k in j) newRow[k] = j[k];
        let saved = await zPost("saveDimRow.zrepo", {dimCode:dim.code, row:newRow})
        this.rowsList.updateRow(this.rowsList.selectedRowIndex, saved)
    }
    buildDetailsTree(dim, row, level) {
        if (!dim.classifiers || !dim.classifiers.length) return "";
        let html = "<ul>";
        for (let classifier of dim.classifiers) {
            html += "<li>" + classifier.name + ": ";
            let subRow = row[classifier.fieldName];
            if (!subRow) {
                html += "Sin Valor"
            } else {
                html += "[" + subRow.code + "] " + subRow.name;
                let subDim = window.zrepo.config.dimensions[classifier.dimensionCode];
                html += this.buildDetailsTree(subDim, subRow, level + 1);
            }
            html += "</li>"
        }
        html += "</ul>";
        return html;
    }

    async onCmdExport_click() {
        let n = await zPost("getRowsCount.zrepo", {dimCode:this.dimension.code})
        if (n > 10000) {
            this.showDialog("common/Error", {message:"La dimensión contiene demasiadas filas. Debe filtrar y exportar por lotes"});
            return;
        }
        let rows = await zPost("getRows.zrepo", {dimCode:this.dimension.code, startRow:0, nRows:n})
        let json = [JSON.stringify(rows)];
        let blob = new Blob(json, {type:"text/plain;charset=utf-8"})
        let url = window.URL || window.webkitURL;
        let link = url.createObjectURL(blob);
        var a = document.createElement("a");
        a.download = this.dimension.code + ".json";
        a.href = link;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    onCmdImport_click() {
        this.showDialog("./WImportDimensionRows", {dimension:this.edDimension.selectedRow}, _ => {
            this.refresh();
        })
    }
}
ZVC.export(Dimensions)