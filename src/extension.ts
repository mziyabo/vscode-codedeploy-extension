'use strict';

import * as vscode from 'vscode';
import { CodeDeployTreeDataProvider } from './dataprovider'

let dataProvider: CodeDeployTreeDataProvider;

export async function activate(context: vscode.ExtensionContext) {

    dataProvider = new CodeDeployTreeDataProvider();
    vscode.window.registerTreeDataProvider('cdExplorer', dataProvider);

    vscode.commands.registerCommand('cdExplorer.deploy', node => dataProvider.deploy(node));
    vscode.commands.registerCommand('cdExplorer.refresh', () => dataProvider.refresh());
    vscode.commands.registerCommand('cdExplorer.selectApplication', () => dataProvider.selectApplication());
    vscode.commands.registerCommand('cdExplorer.createApplication', () => dataProvider.createApplication());
    vscode.commands.registerCommand('cdExplorer.createDeploymentGroup', () => dataProvider.createDeploymentGroup());
    vscode.commands.registerCommand('cdExplorer.addEC2Tag', node => dataProvider.addEC2Tag(node));
    vscode.commands.registerCommand('cdExplorer.addASG', node => dataProvider.addASG(node));
    vscode.commands.registerCommand('cdExplorer.configureRevisionLocations', () => dataProvider.configureRevisionLocations());
    vscode.commands.registerCommand('cdExplorer.deleteApplication', node => { dataProvider.delete(node) }, this);
    vscode.commands.registerCommand('cdExplorer.openconsole', node => { dataProvider.openConsole(node) }, this);
    vscode.commands.registerCommand('cdExplorer.viewDeployment', node => { dataProvider.viewDeployment(node) }, this);
    vscode.commands.registerCommand('cdExplorer.unlinkWorkspace', () => dataProvider.unlinkWorkspace());
    vscode.commands.registerCommand('cdExplorer.deleteEC2Tag', node => dataProvider.deleteEC2TagFilter(node));
    vscode.commands.registerCommand('cdExplorer.deleteASG', node => dataProvider.removeASG(node));

}

export function deactivate() {
}