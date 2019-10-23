'use strict';

import * as vscode from 'vscode';
import { CodeDeployTreeDataProvider } from './dataprovider'

let treeData: CodeDeployTreeDataProvider;

export async function activate(context: vscode.ExtensionContext) {

    let conf = vscode.workspace.getConfiguration("codedeploy");

    treeData = new CodeDeployTreeDataProvider();
    vscode.window.registerTreeDataProvider('cdExplorer', treeData);

    vscode.commands.registerCommand('cdExplorer.deploy', () => { treeData.deploy(); });
    vscode.commands.registerCommand('cdExplorer.refresh', () => { treeData.refresh(); });
    vscode.commands.registerCommand('cdExplorer.select', () => treeData.select());
    vscode.commands.registerCommand('cdExplorer.create', () => treeData.create());
}

export function deactivate() {
}