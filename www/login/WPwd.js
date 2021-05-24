class WPwd extends ZDialog {
    async onThis_init(options) {
        this.options = options;
        if (options.email) this.edEmailPwd.value = options.email;
        this.cmdOk.disable();
        this.errorMsg.hide();
        this.successMsg.hide();
        this.validaPuedeFinalizar();
    }

    validateEmail(mail) {
        if (/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(mail)) return true;
        return false;
    }
    validaPuedeFinalizar() {
        try {
            this.errorMsg.hide();
            this.cmdSendCode.disable();
            this.cmdOk.disable();
            let email = this.edEmailPwd.value.trim();
            if (!email) return;
            if (!email || !this.validateEmail(email)) throw "La dirección email es inválida";
            this.cmdSendCode.enable();            
            let codigo = this.edCodigo.value.trim();
            if (!codigo) {
                this.cmdOk.disable();
                return;
            }
            if (codigo.length < 6) throw "El código ingresado es inválido";
            let pwd1 = this.edPwd.value.trim();
            let pwd2 = this.edRepetirPwd.value.trim();
            if (!pwd1 || !pwd2) throw "Debe ingresa la contraseña y su repetición";
            if (pwd1 != pwd2) throw "La contraseña y su repeticvión son diferentes";
            this.cmdOk.enable();
        } catch(error) {
            this.cmdOk.disable();
            this.errorMsg.show();
            this.errorMsg.text = error.toString();
        }
    }
    onEdCodigo_change() {this.validaPuedeFinalizar()}
    onEdEmailPwd_change() {this.validaPuedeFinalizar()}
    onEdPwd_change() {this.validaPuedeFinalizar()}
    onEdRepetirPwd_change() {this.validaPuedeFinalizar()}

    async onCmdSendCode_click() {
        let email = this.edEmailPwd.value.trim();
        this.errorMsg.hide();
        try {
            await zPost("enviaCodigoCambioPwd.zrepo", {email});
            this.showDialog("common/WInfo", {message:"Durante los próximos minutos debería llegarle un correo electróniuco con el código de seguridad de seis dígitos que debe pegar más abajo"})
        } catch (error) {
            this.errorMsg.text = error.toString();
            this.errorMsg.show();
        }
    }

    async onCmdOk_click() {
        try {
            this.errorMsg.hide();
            let email = this.edEmailPwd.value.trim();
            let codigo = this.edCodigo.value.trim();            
            let pwd = this.edPwd.value.trim();
            this.cmdOk.disable();
            this.cmdCancel.disable();
            this.cmdSendCode.disable();
            await zPost("cambiarPwd.zrepo", {email, codigo, pwd})
            this.successMsg.text = "Contraseña Modicada";
            this.successMsg.show();
            setTimeout(_ => this.close(), 2000);
        } catch(error) {
            this.errorMsg.show();
            this.errorMsg.text = error.toString();
            this.cmdOk.enable();
            this.cmdCancel.enable();
        }        
    }

    onCmdCancel_click() { this.cancel() }
}
ZVC.export(WPwd);