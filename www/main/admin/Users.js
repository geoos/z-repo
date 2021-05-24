class Users extends ZCustomController {
    onThis_init() {
        this.refresh();
    }

    refresh() {this.list.refresh()}

    async onList_getRows() {
        let rows = await zPost("getUsers.zrepo", {});     
        return rows;
    }

    async onCmdAdd_click() {
        await this.list.openNewDetails(
            "./EdUser", {
                newRecord:true
            }
        );
    }
    onList_getDetailsConfig(row, rowIndex) {
        return {
            path:"./EdUser",
            options:{                
                record:row
            }
        }
    }

    async onList_cancel(row, rowIndex) {
        await this.list.closeDetails(rowIndex);
    }
    async onList_saved(row, rowIndex, changedeRecord) {
        await this.list.closeDetails(rowIndex);
        this.refresh();
    }
    async onList_deleted(row, rowIndex) {
        await this.list.closeDetails(rowIndex);
        this.refresh();
    }
}
ZVC.export(Users);