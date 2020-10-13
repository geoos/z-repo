class Admin extends ZCustomController {
    async onThis_init() {
        this.opcionActiva = null;
        $(this.sideBar.view).find(".opcion-side-bar").click(e => {
            let id = e.currentTarget.id;
            this.seleccionaOpcion(id);
        })
    }

    async seleccionaOpcion(idOpcion) {
        const paneles = {
            opDimensiones:"./Dimensions",
            opDataSets:"./DataSets"
        }
        $(this.sideBar.view).find(".opcion-side-bar").removeClass("opcion-side-bar-activa");
        let panel = paneles[idOpcion];
        await this.opcionLoader.load(panel);
        $(this.sideBar.view).find("#" + idOpcion).addClass("opcion-side-bar-activa");
    }
}
ZVC.export(Admin)