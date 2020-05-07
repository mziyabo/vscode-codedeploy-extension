import * as vscode from 'vscode';
import { CDExtension } from '../commands';

export async function selectApplication() {

    let extension = new CDExtension();
    if (vscode.workspace.workspaceFolders) {
        await extension.cdUtil.addExistingApplication();

        vscode.commands.executeCommand("cdExplorer.refresh");
    }
    else {
        let openWorkspaceResponse = await vscode.window.showInformationMessage("Active workspace required to link with CodeDeploy.\n Would you like to open a workspace", "Open Workspace", "Later");

        if (openWorkspaceResponse == "Open Workspace") {
            let success = await vscode.commands.executeCommand('vscode.openFolder');
            if (success) {
                selectApplication();
            }
        }
    }
}
