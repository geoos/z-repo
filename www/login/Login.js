class Login extends ZCustomController {
    async onThis_init() {
        $(this.find("#noWait")).show();
        $(this.find("#wait")).hide();
        this.edEmail.view.onkeypress = e => { if (e.keyCode == 13) this.onCmdLogin_click() }
        this.edPwd.view.onkeypress = e => { if (e.keyCode == 13) this.onCmdLogin_click() }
        setTimeout(_ => this.edEmail.view.focus(), 200);
    }

    onCmdLogin_click() {
        $(this.find("#noWait")).hide();
        $(this.find("#wait")).show();
        this.cmdLogin.disable();
        zPost("login.zrepo", { email: this.edEmail.value, pwd: this.edPwd.value }, sesion => {
            if (this.edRecordarme.checked) {
                window.localStorage.setItem("sesion", sesion.token);
            } else {
                window.localStorage.removeItem("sesion");
            }
            window.sesion=sesion;
            this.triggerEvent("login", sesion);
        }, error => {
            $(this.find("#noWait")).show();
            $(this.find("#wait")).hide();
            this.cmdLogin.enable();
            this.showDialog("common/WError", { message: error.toString() })
        })
    }

    onCmdOlvidoPwd_click() {
        this.showDialog("./WPwd", {});
    }
}
ZVC.export(Login);