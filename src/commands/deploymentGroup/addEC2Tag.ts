import * as vscode from 'vscode';
import { CDExtension } from '../commands';

export async function addEC2Tag(node: vscode.TreeItem) {

    let extension = new CDExtension();
    let deploymentGroupName = node.id.substr(15, node.label.length);
    let response = await extension.cdUtil.addEC2Tag(deploymentGroupName);
    
    if (response) {
        vscode.commands.executeCommand("cdExplorer.refresh");
    }
}