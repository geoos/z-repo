class WPwd extends ZDialog {
    async onThis_init(options) {
        this.options = options;
        this.edPwd.disable();
        this.edRepetirPwd.disable();
        this.cmdOk.disable();
        this.errorMsg.hide();
        this.successMsg.hide();
    }


    async onEdCodigo_change() {
        let valEmail = validarEmail(this.edEmailPwd.value.trim());
        this.errorMsg.hide();
        let obj = {
            email: this.edEmailPwd.value.trim(),
            codigo: this.edCodigo.value.trim()
        }
        try {
            if (!valEmail) throw "$[seguridad.panelUsuarios.emailInvalido]";
            if (this.edCodigo.value == "") throw "$[login.creaPwd.mensajeVacioCodigo]";

            zPost("verificarCode.seg", { obj: obj }, code => {

                if (code.finCodigo) {
                    this.showDialog("common/WInfo", { message: window.toLang("$[login.creaPwd.mensajeFinCodigoVerificacion]") });
                    return;
                }

                if (code) {
                    this.edPwd.enable();
                    this.edRepetirPwd.enable();
                    this.cmdOk.enable();
                }
            }, error => {
                this.edPwd.disable();
                this.edRepetirPwd.disable();
                this.cmdOk.disable();
                this.showDialog("common/WError", { message: error.toString() })
            });

        } catch (error) {
            this.errorMsg.text = window.toLang(error.toString());
            this.errorMsg.show();
        }


    }

    async onCmdSendCode_click() {
        let valEmail = validarEmail(this.edEmailPwd.value.trim());
        this.errorMsg.hide();
        this.successMsg.hide();
        let obj = {
            email: this.edEmailPwd.value.trim()
        }
        try {
            if (!valEmail) throw "$[seguridad.panelUsuarios.emailInvalido]";
            this.cmdSendCode.disable();
            zPost("sendCode.seg", { obj: obj }, code => {
                this.successMsg.show();
                this.successMsg.text = window.toLang("$[comunes.envioCorreo]");
                this.cmdSendCode.enable();
            }, error => {
                this.cmdSendCode.enable();
                this.showDialog("common/WError", { message: error.toString() })
            });

        } catch (error) {
            this.errorMsg.text = window.toLang(error.toString());
            this.errorMsg.show();
            this.successMsg.hide();
        }

    }

    async onCmdOk_click() {
        let valPwd = validarPassword(this.edPwd.value.trim());
        let valRepetirPwd = validarPassword(this.edRepetirPwd.value.trim());
        let valEmail = validarEmail(this.edEmailPwd.value.trim());
        this.errorMsg.hide();
        this.successMsg.hide();
        let controller = this;

        let obj = {
            pwd: this.edPwd.value.trim(),
            codigo: this.edCodigo.value.trim(),
            email: this.edEmailPwd.value.trim()
        }

        try {
            if (!valEmail) throw "$[seguridad.panelUsuarios.emailInvalido]";
            if (this.edCodigo.value == "") throw "$[login.creaPwd.mensajeVacioCodigo]";
            if (this.edPwd.value == "") throw "$[login.creaPwd.mensajeVacioPwd]";
            if (valPwd.length > 0) throw "$[login.creaPwd.mensajeTituloPwd]" + " " + valPwd;
            if (this.edRepetirPwd.value == "") throw "$[login.creaPwd.mensajeVacioRepetirPwd]";
            if (valRepetirPwd.length > 0) throw "$[login.creaPwd.mensajeTituloRepitePwd]" + " " + valRepetirPwd;
            if (this.edPwd.value != this.edRepetirPwd.value) throw "$[login.creaPwd.mensajeCoincidirCampos]";

            this.cmdOk.disable();
            zPost("createPwd.seg", { obj: obj }, code => {


                if (code.existePwd) {
                    this.errorMsg.show();
                    this.errorMsg.text = window.toLang("$[login.creaPwd.mensajePwdRegistrado]");
                    this.cmdOk.enable();
                    return;
                }

                this.errorMsg.hide();
                this.successMsg.show();
                this.successMsg.text = window.toLang("$[login.creaPwd.mensajeCreaPwdOK]");


                setInterval(function () {
                    controller.cmdOk.enable();
                    controller.close();
                    controller.successMsg.hide();
                }, 3000);

            }, error => {
                this.cmdOk.enable();
                this.showDialog("common/WError", { message: error.toString() })
            });

        } catch (error) {
            this.errorMsg.text = window.toLang(error.toString());
            this.errorMsg.show();
        }
    }





    onCmdCancel_click() { this.cancel() }
}
ZVC.export(WPwd);