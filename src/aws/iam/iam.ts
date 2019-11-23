let AWS = require('aws-sdk');
import * as vscode from 'vscode'
import { QuickPickItem } from '../../shared/ui/quickpickitem'

export class IAMUtil {

    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration("codedeploy");
        if (this.config.get("enableAwsLogging")) {
          AWS.config.logger = console;
        } 
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
                roles.push(item);
            });
        }

        return roles;
    }
}
