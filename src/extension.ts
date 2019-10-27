'use strict';

import * as vscode from 'vscode';
import { CodeDeployTreeDataProvider } from './dataprovider'

let dataProvider: CodeDeployTreeDataProvider;

export async function activate(context: vscode.ExtensionContext) {

    dataProvider = new CodeDeployTreeDataProvider();
    vscode.window.registerTreeDataProvider('cdExplorer', dataProvider);

    vscode.commands.registerCommand('cdExplorer.deploy', () => dataProvider.deploy());
    vscode.commands.registerCommand('cdExplorer.refresh', () => dataProvider.refresh());
    vscode.commands.registerCommand('cdExplorer.select', () => dataProvider.select());
    vscode.commands.registerCommand('cdExplorer.create', () => dataProvider.create());

    vscode.commands.registerCommand('cdExplorer.viewDeployment', node => { dataProvider.viewDeployment(node) }, this);
}

export function deactivate() {
}