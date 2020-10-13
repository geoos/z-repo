class EdDimRow extends ZCustomController {
    onThis_init(options) {
        this.options = options;        
        this.errorMsg.hide();
        if (options.newRecord) {
            this.cmdDelete.hide();
            setTimeout(_ => this.edCode.view.focus(), 200)
        } else {
            this.record = options.record;
            this.edCode.value = this.record.code;
            this.edName.value = this.record.name;
            this.edCode.disable();            
        }
        this.buildClassifiers();
    }

    async buildClassifiers() {
        if (!this.options.dimension || !this.options.dimension.classifiers || !this.options.dimension.classifiers.length) return;
        this.classifierEditors = {}
        let html = this.options.dimension.classifiers.reduce((html, classifier) => {
            let id = "ed-" + classifier.fieldName;
            return html + `
            <div class="form-row">
                <div class="col">
                    <div id="${id}" data-z-component="common/DimValSelector" data-z-label="${classifier.name}"></div>
                </div>
            </div>
            `;
        }, "")
        this.classCnt.html = html;
        for (let classifier of this.options.dimension.classifiers) {
            let id = "ed-" + classifier.fieldName;
            let domEd = this.classCnt.find("#" + id);
            let ed = await ZVC.fromElement(domEd, {
                classifier:classifier,
                value:(this.record?this.record[classifier.fieldName]:null)
            })
            this.classifierEditors[classifier.fieldName] = ed;
        }
    }

    onCmdCancel_click() {this.triggerEvent("cancel")}
    async onCmdSave_click() {
        this.errorMsg.hide();         
        try {
            let codigo = this.edCode.value.trim();
            if (!codigo) throw "Debe ingresar un código para la fila";
            let nombre = this.edName.value.trim();
            if (!nombre) throw "Debe ingresar un nombre o descripción para la fila";
            let changedRecord = {code:codigo, name:nombre}
            
            if (this.options.dimension && this.options.dimension.classifiers && this.options.dimension.classifiers.length) {
                for (let classifier of this.options.dimension.classifiers) {
                    let ed = this.classifierEditors[classifier.fieldName];
                    if (!ed.value) throw "Debe seleccionar un valor para " + classifier.name;
                    changedRecord[classifier.fieldName] = ed.value;
                }
            }

            if (this.options.newRecord) {
                changedRecord = await zPost("addDimRow.zrepo", {dimCode:this.options.dimension.code, row:changedRecord})
            } else {
                changedRecord = await zPost("saveDimRow.zrepo", {dimCode:this.options.dimension.code, row:changedRecord})
            }
            this.triggerEvent("saved", changedRecord);
        } catch(error) {
            this.errorMsg.text = error.toString();
            this.errorMsg.show();
        }
    }
    onCmdDelete_click() {
        this.showDialog("common/WConfirm", {
            message: "¿Confirma que desea eliminar esta fila?"
        }, async _=> {
            await zPost("deleteDimRow.zrepo", {dimCode:this.options.dimension.code, code:this.record.code})
            this.triggerEvent("deleted");
        });
    }
}
ZVC.export(EdDimRow)