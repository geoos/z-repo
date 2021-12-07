class WLabels extends ZDialog {
    onThis_init(options) {
        this.options = options;
        this.edConfig.value = JSON.stringify(options.layout, null, 4);
    }    

    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onCmdOk_click() {
        let ly;
        try {
            ly = JSON.parse(this.edConfig.value);
            this.close({layout:ly})
        } catch(error) {
            this.showDialog("common/WError", {message:"Error interpretando JSON:" + error.toString()});
        }
    }
}
ZVC.export(WLabels);