import * as vscode from 'vscode';
import { CDExtension } from '../commands';

export async function stopDeployment(node: vscode.TreeItem) {
    let extension = new CDExtension();

    await extension.cdUtil.stopDeployment(node.label);
    vscode.commands.executeCommand("cdExplorer.refresh");
}