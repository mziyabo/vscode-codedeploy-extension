import * as vscode from 'vscode';
import { CDExtension } from '../commands';
import { addTargetsHint } from "../addTargetsHint";

export async function createApplication() {

    let extension = new CDExtension();
    if (vscode.workspace.workspaceFolders) {

        let response = await extension.cdUtil.scaffoldApplication();
        if (response) {
            addTargetsHint(response);
        }

        vscode.commands.executeCommand("cdExplorer.refresh");
    }
    else {
        let openWorkspaceResponse = await vscode.window.showInformationMessage("Active workspace required to link with CodeDeploy.\n Would you like to open a workspace", "Open Workspace", "Later");

        if (openWorkspaceResponse == "Open Workspace") {
            let success = await vscode.commands.executeCommand('vscode.openFolder');
            if (success) {
                createApplication();
            }
        }
    }
}
