import * as vscode from 'vscode';
import { CDExtension } from '../commands';

export async function removeASG(node: vscode.TreeItem) {

    let extension = new CDExtension();

    let autoScalingGroupName;
    let deploymentGroupName;

    if (node) {
        autoScalingGroupName = node.label;
        deploymentGroupName = node.contextValue.substr(12, node.contextValue.length);

        await extension.cdUtil.removeASG(autoScalingGroupName, deploymentGroupName);

        vscode.commands.executeCommand("cdExplorer.refresh");
    }
}