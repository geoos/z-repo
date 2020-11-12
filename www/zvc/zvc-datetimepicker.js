class ZDateTimePicker extends ZController {
    onThis_init() {
        this.$view = $(this.view);
        this.locale = this.$view.data("z-locale") || window.language || "es";
        this.$view.datetimepicker({
            locale:this.locale,
            format:this.$view.data("z-format") || "DD/MM/YYYY",
            keepInvalid:false,
            sideBySide:true,
            //keepOpen:true,
            //debug:true,
            icons: {
                time: "fas fa-clock-o",
                date: "fas fa-calendar",
                up: "fas fa-chevron-up",
                down: "fas fa-chevron-down",
                previous: 'fas fa-chevron-left',
                next: 'fas fa-chevron-right',
                today: 'fas fa-screenshot',
                clear: 'fas fa-trash',
                close: 'fas fa-remove'
            },
            //widgetPositioning:{horizontal:"left", vertical:"auto"}
            //widgetParent:$(this.view.parentElement)
            //pickerPosition: "top-left"
        });
        this.$view.on("dp.change", () => {
            if (this.ignoreNextChange) {
                this.ignoreNextChange = false;
                return;
            }
            this.triggerEvent("change", [this.value])
        })
    }

    set value(dt) {
        this.ignoreNextChange = true;
        this.$view.data("DateTimePicker").date(dt);
        this.$view.addClass("is-filled");
    }
    get value() {
        if (!this.$view.data("DateTimePicker").date()) return null;
        let dt = this.$view.data("DateTimePicker").date();
        return dt;
        //return dt.toDate();
    }

    get format() {return this.$view.data("DateTimePicker").format()}
    set format(fmt) {this.$view.data("DateTimePicker").format(fmt)}
}

ZVC.registerComponent("INPUT", e => (e.classList.contains("datetimepicker")), ZDateTimePicker);