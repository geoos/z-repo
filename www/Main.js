class Main extends ZCustomController {
    async onThis_init() {
        window.timeZone = moment.tz.guess();
        moment.tz.setDefault(window.timeZone)
        zClientDefaultErrorHandler = msg => this.showDialog("common/WError", {message:msg})
        window.config = await zPost("getConfig.zrepo");
        window.zrepo = new ZRepo(window.config);
        this.mainLoader.load("./login/Login")
    }

    onMainLoader_login() {
        this.mainLoader.load("./main/MainMenu")
    }
}
ZVC.export(Main);