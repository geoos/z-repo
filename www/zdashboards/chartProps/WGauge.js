class WGauge extends ZDialog {
    onThis_init(options) {
        this.options = options;
        this.edEscala.value = options.scale;
        this.min = options.min;
        this.max = options.max;
        this.ranges = JSON.parse(JSON.stringify(options.ranges));
        this.firstColor = options.firstColor;
        this.firstLabel = options.firstLabel;
        this.refreshRanges();
    } 

    refreshRanges() {
        this.rows = [];
        setTimeout(_ => this.list.refresh(), 10);
        let r0 = {min:this.min, color:this.firstColor, label:this.firstLabel, isFirst:true};
        this.rows.push(r0);
        if (!this.ranges.length) {
            r0.max = this.max; r0.isLast = true;            
            return;
        }
        for (let r of this.ranges) {
            let rr = this.rows[this.rows.length - 1];
            rr.max = r.value; 
            this.rows.push({min:r.value, color:r.color, label:r.label});
        }
        let rr = this.rows[this.rows.length - 1];
        rr.max = this.max; rr.isLast = true;
    }

    onList_getRows() {
        return this.rows.map(r => {
            r.range = r.min + " - " + r.max;
            r.fmtColor = "<span class='px-2 py-1' style='background-color: " + r.color + ";'>" + r.color + "</span>";
            return r;
        })
    }

    onList_getDetailsConfig(row, rowIndex) {
        return {
            path:"./EdRangoGauge",
            options:{                
                record:row
            }
        }
    }

    async onList_cancel(row, rowIndex) {
        await this.list.closeDetails(rowIndex);
    }
    async onList_saved(row, rowIndex, record) {
        await this.list.closeDetails(rowIndex);
        if (record.isFirst) {
            this.min = record.min;
            this.firstColor = record.color;
            this.firstLabel = record.label;
            if (!record.isLast) this.ranges[0].value = record.max;
        }
        if (record.isLast) {
            this.max = record.max;
        } else {
            this.ranges[rowIndex].value = record.max;
        }
        if (!record.isFirst) {
            let i = rowIndex - 1;            
            this.ranges[i].label = record.label;
            this.ranges[i].color = record.color;
        }            
        this.refreshRanges();
    }
    async onList_deleted(row, rowIndex) {
        await this.list.closeDetails(rowIndex);
        this.ranges.splice(rowIndex - 1, 1);
        this.refreshRanges();
    }
    
    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onCmdOk_click() {
        let scale = parseFloat(this.edEscala.value);
        if (scale < 0 || scale > 10) return;
        this.close({
            scale, min:this.min, max:this.max,
            firstLabel: this.firstLabel, firstColor:this.firstColor,
            ranges: this.ranges
        });
    }
}
ZVC.export(WGauge);