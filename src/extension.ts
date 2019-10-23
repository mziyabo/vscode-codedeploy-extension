'use strict';

import * as vscode from 'vscode';
import { CodeDeployTreeDataProvider } from './dataprovider'
import { CDDeployment } from './model/model';

let treeData: CodeDeployTreeDataProvider;

export async function activate(context: vscode.ExtensionContext) {

    let conf = vscode.workspace.getConfiguration("codedeploy");

    treeData = new CodeDeployTreeDataProvider();
    vscode.window.registerTreeDataProvider('cdExplorer', treeData);

    vscode.commands.registerCommand('cdExplorer.deploy', () => { treeData.deploy(); });
    vscode.commands.registerCommand('cdExplorer.refresh', () => { treeData.refresh(); });
    vscode.commands.registerCommand('cdExplorer.select', () => treeData.select());
    vscode.commands.registerCommand('cdExplorer.create', () => treeData.create());

    vscode.commands.registerCommand('cdExplorer.viewDeployment', (args: any[]) => { treeData.cdUtil.viewDeployment(args) }, this);
}

export function deactivate() {
}