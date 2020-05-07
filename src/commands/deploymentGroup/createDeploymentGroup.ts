import * as vscode from 'vscode';
import { CDExtension } from '../commands';
import { addTargetsHint } from '../addTargetsHint';

export async function createDeploymentGroup() {

    let extension = new CDExtension();
    let response = await extension.cdUtil.createDeploymentGroup();

    if (response) {
        addTargetsHint(response);
    }

    vscode.commands.executeCommand("cdExplorer.refresh");
}