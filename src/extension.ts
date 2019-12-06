'use strict';
import * as vscode from 'vscode';
import { CodeDeployTreeDataProvider } from './dataprovider'
import { ExtCommand } from './commands/commands';
let dataProvider: CodeDeployTreeDataProvider;

export async function activate(context: vscode.ExtensionContext) {
    vscode.window.withProgress({
        cancellable: false,
        title: "Activating AWS CodeDeploy extension",
        location: vscode.ProgressLocation.Window
    },
        async (progress, token) => {

            dataProvider = new CodeDeployTreeDataProvider();
            vscode.window.registerTreeDataProvider('cdExplorer', dataProvider);

            let extcmd: ExtCommand = new ExtCommand(dataProvider);

            vscode.commands.registerCommand('cdExplorer.deploy', node => extcmd.deploy(node));
            vscode.commands.registerCommand('cdExplorer.refresh', () => dataProvider.refresh());
            vscode.commands.registerCommand('cdExplorer.selectApplication', () => extcmd.selectApplication());
            vscode.commands.registerCommand('cdExplorer.createApplication', () => extcmd.createApplication());
            vscode.commands.registerCommand('cdExplorer.createDeploymentGroup', () => extcmd.createDeploymentGroup());
            vscode.commands.registerCommand('cdExplorer.addEC2Tag', node => extcmd.addEC2Tag(node));
            vscode.commands.registerCommand('cdExplorer.addASG', node => extcmd.addASG(node));
            vscode.commands.registerCommand('cdExplorer.configureRevisionLocations', () => extcmd.configureRevisionLocations());
            vscode.commands.registerCommand('cdExplorer.deleteApplication', node => { extcmd.deleteApplication(node) }, this);
            vscode.commands.registerCommand('cdExplorer.deleteDeploymentGroup', node => { extcmd.deleteDeploymentGroup(node) }, this);
            vscode.commands.registerCommand('cdExplorer.openconsole', node => { extcmd.openConsole(node) }, this);
            vscode.commands.registerCommand('cdExplorer.viewDeployment', node => { extcmd.viewDeployment(node) }, this);
            vscode.commands.registerCommand('cdExplorer.unlinkWorkspace', () => extcmd.unlinkWorkspace());
            vscode.commands.registerCommand('cdExplorer.deleteEC2Tag', node => extcmd.deleteEC2TagFilter(node));
            vscode.commands.registerCommand('cdExplorer.deleteASG', node => extcmd.removeASG(node));
            vscode.commands.registerCommand('cdExplorer.stopDeployment', node => extcmd.stopDeployment(node));
        })

}

export function deactivate() {
}