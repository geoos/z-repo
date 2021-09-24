class EdRangoGauge extends ZCustomController {
    onThis_init(options) {
        this.options = options;        
        this.errorMsg.hide();
        if (options.newRecord) {
            this.cmdDelete.hide();
        } else {
            this.record = options.record;
        }
    }

    onCmdCancel_click() {this.triggerEvent("cancel")}

    async onCmdSave_click() {
        this.errorMsg.hide();         
        try {
            let r = {};
            if (this.options.newRecord) {
            } else {
            }
            this.triggerEvent("saved", r);
        } catch(error) {
            this.errorMsg.text = error.toString();
            this.errorMsg.show();
        }
    }
    onCmdDelete_click() {
        this.showDialog("common/WConfirm", {
            message: "¿Confirma que desea eliminar este Rango?"
        }, async _=> {
            this.triggerEvent("deleted");
        });
    }
}
ZVC.export(EdRangoGauge)