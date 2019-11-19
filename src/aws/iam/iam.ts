import * as vscode from 'vscode'
import { QuickPickItem } from '../../shared/ui/quickpickitem'
let AWS = require('aws-sdk');

export class IAMUtil {

    private conf;

    constructor() {
        this.conf = vscode.workspace.getConfiguration("codedeploy");
    }

    /**
     * Retrieve CodeDeploy Service Role
     */
    async listServiceRoles() {

        let client = new AWS.IAM({
            apiVersion: "2010-05-08"
        });

        let response = await client.listRoles({ }).promise();
        return response;
    }

    async getRolesAsQuickPickItems() {

        // TODO: filter service roles by AssumeRoleDocument service
        let listRoleResponse = await this.listServiceRoles();

        let roles: vscode.QuickPickItem[] = [];

        if (listRoleResponse.Roles) {

            listRoleResponse.Roles.forEach(role => {

                let item = new QuickPickItem(role.Arn, role.Description)
                item.description = role.Description;
                roles.push(item);
            });
        }

        return roles;
    }
}
