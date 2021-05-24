class EdUser extends ZCustomController {
    onThis_init(options) {
        this.options = options;        
        this.errorMsg.hide();
        if (options.newRecord) {
            this.cmdDelete.hide();
            setTimeout(_ => this.edEmail.view.focus(), 200)
        } else {
            this.record = options.record;
            this.edEmail.value = this.record.email;
            this.edName.value = this.record.name;
            this.edEmail.disable();            
        }
    }

    onCmdCancel_click() {this.triggerEvent("cancel")}
    validateEmail(mail) {
        if (/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(mail)) return true;
        return false;
    }


    async onCmdSave_click() {
        this.errorMsg.hide();         
        try {
            let email = this.edEmail.value.trim();
            if (!email || !this.validateEmail(email)) throw "Debe ingresar un email válido para el usuario";
            let name = this.edName.value.trim();
            if (!name) throw "Debe ingresar el Nombre del Usuario";
            let changedRecord = {email, name}
            
            if (this.options.newRecord) {
                changedRecord = await zPost("addUser.zrepo", {user:changedRecord})
            } else {
                changedRecord._id = this.options.record._id;
                changedRecord = await zPost("saveUser.zrepo", {user:changedRecord})
            }
            this.triggerEvent("saved", changedRecord);
        } catch(error) {
            this.errorMsg.text = error.toString();
            this.errorMsg.show();
        }
    }
    onCmdDelete_click() {
        this.showDialog("common/WConfirm", {
            message: "¿Confirma que desea eliminar este Usuario?"
        }, async _=> {
            await zPost("deleteUser.zrepo", {email:this.record.email})
            this.triggerEvent("deleted");
        });
    }
}
ZVC.export(EdUser)