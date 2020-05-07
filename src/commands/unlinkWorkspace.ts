import * as vscode from 'vscode';
import { CDExtension } from './commands';

export async function unlinkWorkspace() {

    let extension = new CDExtension();
    extension.config = vscode.workspace.getConfiguration("codedeploy");

    let settings = [
        "applicationName",
        "deploymentGroupName",
        "revisionBucket",
        "revisionLocalDirectory",
        "isApplicationWorkspace"
    ];

    settings.forEach(async setting => {
        await extension.config.update(setting, undefined);
    });

    await extension.config.update("isApplicationWorkspace", false);
    vscode.commands.executeCommand("cdExplorer.refresh");
}