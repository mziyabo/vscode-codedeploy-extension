import * as vscode from 'vscode';
import { CDExtension } from '../commands';

export async function deleteDeploymentGroup(node: vscode.TreeItem) {

    let extension = new CDExtension();

    await extension.cdUtil.deleteDeploymentGroup(node.label);
    vscode.commands.executeCommand("cdExplorer.refresh");
}