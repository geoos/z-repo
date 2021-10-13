class WPeriod extends ZDialog {
    async onThis_init(options) {
        this.options = options;
        this.temporality = options.temporality;
        switch(this.temporality) {
            case "5m":
            case "15m":
            case "30m":
            case "1h":
                await this.periodLoader.load("./Hours", options);
                break;
            case "1d":
                await this.periodLoader.load("./Days", options);
                break;
            case "1M":
            case "3M":
            case "4M":
            case "6M":
                await this.periodLoader.load("./Months", options);
                break;
            case "1y":
                await this.periodLoader.load("./Years", options);
                break;
        }
        console.log("options", options);
    }

    onPeriodLoader_valida(ok) {
        if (ok) this.cmdOk.enable();
        else this.cmdOk.disable();
    }
    onCmdOk_click() {
        this.close({start:this.periodLoader.content.start, end:this.periodLoader.content.end});
    }

    onCmdCancel_click() { this.cancel() }
}
ZVC.export(WPeriod);