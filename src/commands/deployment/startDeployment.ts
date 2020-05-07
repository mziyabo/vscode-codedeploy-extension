import * as vscode from 'vscode';
import { CDExtension } from '../commands';

export async function startDeployment(node: vscode.TreeItem) {

    let extension = new CDExtension();

    await extension.cdUtil.deploy(node.label);
    vscode.commands.executeCommand("cdExplorer.refresh");
}