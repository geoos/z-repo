class Main extends ZCustomController {
    async onThis_init() {
        window.timeZone = moment.tz.guess();
        moment.tz.setDefault(window.timeZone)
        zClientDefaultErrorHandler = msg => this.showDialog("common/WError", {message:msg})
        window.config = await zPost("getConfig.zrepo");
        window.zrepo = new ZRepo(window.config);
        if (!window.config["public-token"]) console.error("No 'public-token' in zrepo config");
        window.zRepoClient = new ZRepoClient("", window.config["public-token"]);
        this.mainLoader.load("./login/Login")
    }

    onMainLoader_login() {
        this.mainLoader.load("./main/MainMenu")
    }
}
ZVC.export(Main);