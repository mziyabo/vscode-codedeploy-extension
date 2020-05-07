import * as vscode from 'vscode';
import { CDExtension } from './commands';

export async function addTargetsHint(response) {

    let extension = new CDExtension();
    if (response) {
        vscode.commands.executeCommand("cdExplorer.refresh");
        if (response.deploymentGroupName) {

            let hintResponse = await vscode.window.showInformationMessage(`Add targets for ${response.deploymentGroupName}`, "Add AutoScaling Group", "Add EC2 Tag Filters", "Not Now")

            switch (hintResponse) {
                case "Add AutoScaling Group":
                    extension.cdUtil.addASG(response.deploymentGroupName);
                    vscode.commands.executeCommand("cdExplorer.refresh");
                    break;

                case "Add EC2 Tag Filters":
                    extension.cdUtil.addEC2Tag(response.deploymentGroupName);
                    vscode.commands.executeCommand("cdExplorer.refresh");
                    break;
            }
        }
    }
}