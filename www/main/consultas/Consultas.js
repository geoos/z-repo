class Consultas extends ZCustomController {
    onThis_activated() {
        console.log("cons activated");
        const margenX = 50, margenY = 100;
        window.onresize = _ => {
            this.customQuery.doResize(this.size.width - margenX, window.innerHeight - margenY);
        }
        this.customQuery.doResize(this.size.width - margenX, window.innerHeight - margenY);
    }
    onThis_deactivated() {
        console.log("cons deactivated");
        window.onresize = null;
    }
}
ZVC.export(Consultas);