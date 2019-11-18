'use strict';

import * as vscode from 'vscode';
import { CodeDeployTreeDataProvider } from './dataprovider'

let dataProvider: CodeDeployTreeDataProvider;

export async function activate(context: vscode.ExtensionContext) {

    dataProvider = new CodeDeployTreeDataProvider();
    vscode.window.registerTreeDataProvider('cdExplorer', dataProvider);

    vscode.commands.registerCommand('cdExplorer.deploy', () => dataProvider.deploy());
    vscode.commands.registerCommand('cdExplorer.refresh', () => dataProvider.refresh());
    vscode.commands.registerCommand('cdExplorer.selectApplication', () => dataProvider.selectApplication());
    vscode.commands.registerCommand('cdExplorer.createApplication', () => dataProvider.createApplication());
    vscode.commands.registerCommand('cdExplorer.addEC2Tag', () => dataProvider.addEC2Tag());
    vscode.commands.registerCommand('cdExplorer.addASG', () => dataProvider.addASG());
    vscode.commands.registerCommand('cdExplorer.configureRevisionLocations', () => dataProvider.configureRevisionLocations());
    vscode.commands.registerCommand('cdExplorer.deleteApplication', node => { dataProvider.delete(node) }, this);
    vscode.commands.registerCommand('cdExplorer.openconsole', node => { dataProvider.openConsole(node) }, this);
    vscode.commands.registerCommand('cdExplorer.viewDeployment', node => { dataProvider.viewDeployment(node) }, this);
    vscode.commands.registerCommand('cdExplorer.unlinkWorkspace', () => dataProvider.unlinkWorkspace());

}

export function deactivate() {
}