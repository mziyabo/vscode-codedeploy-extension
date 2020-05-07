import * as vscode from 'vscode';
import { CDExtension } from '../commands';

export async function deleteEC2TagFilter(node: vscode.TreeItem) {

    let extension = new CDExtension();
    let deploymentGroupName = node.contextValue.substr(13, node.contextValue.length);
    let ec2TagKey = node.id.substr(deploymentGroupName.length + 1, node.id.length);

    extension.cdUtil.deleteEC2TagFilter(ec2TagKey, deploymentGroupName);
    vscode.commands.executeCommand("cdExplorer.refresh");
}