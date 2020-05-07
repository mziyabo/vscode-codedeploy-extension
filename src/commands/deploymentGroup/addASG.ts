import * as vscode from 'vscode';
import { CDExtension } from '../commands';

export async function addASG(node: vscode.TreeItem) {

    let extension = new CDExtension();
    let deploymentGroupName = node.id.substr(12, node.id.length);

    let response = await extension.cdUtil.addASG(deploymentGroupName);
    if (response) {
        vscode.commands.executeCommand("cdExplorer.refresh");
    }
}
