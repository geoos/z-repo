class MainMenu extends ZCustomController {
    onCmdAdmin_click() {this.loader.load("./admin/Admin")}
    onCmdConsultas_click() {this.loader.load("./consultas/Consultas")}
}
ZVC.export(MainMenu)