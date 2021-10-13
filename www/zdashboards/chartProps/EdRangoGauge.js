class EdRangoGauge extends ZCustomController {
    onThis_init(options) {
        this.options = options;        
        this.record = options.record;
        this.errorMsg.hide();   
        if (this.record.isFirst) this.cmdDelete.hide();
        else this.edFromValue.disable();
        this.edFromValue.value = this.record.min;
        this.edToValue.value = this.record.max;
        this.edLabel.value = this.record.label;
        this.edColor.value = this.record.color;
    }

    onCmdCancel_click() {this.triggerEvent("cancel")}

    async onCmdSave_click() {
        this.errorMsg.hide();         
        try {
            let min = parseFloat(this.edFromValue.value);
            let max = parseFloat(this.edToValue.value);
            if (isNaN(min)) throw "Valor Inicial Inválido";
            if (isNaN(max)) throw "Valor Final Inválido";
            if (min >= max) throw "Rango Inválido";
            let r = JSON.parse(JSON.stringify(this.record));
            r.min = min;
            r.max = max;
            r.label = this.edLabel.value;
            r.color = this.edColor.value;
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