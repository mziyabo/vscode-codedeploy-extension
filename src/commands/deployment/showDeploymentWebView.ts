import { TreeItemIcons } from '../../shared/ui/icons';
import path = require('path');
import { Uri, ViewColumn, workspace, commands, window } from 'vscode';

/**
 * Track InProgress Deployment in WebView (WIP)
 * @param deploymentId Deployment ID
 */
export async function showDeploymentWebView(deploymentId: string = "") {

    try {
        const panel = window.createWebviewPanel("deploymentWebView", `Deployment ${deploymentId}`, {
            viewColumn: ViewColumn.Active
        });

        panel.iconPath = TreeItemIcons.Application;

        const uri = Uri.file(path.join(__dirname, "..", `resources/webview/deployment.html`));
        panel.webview.html = (await workspace.openTextDocument(uri)).getText();
        commands.executeCommand("cdExplorer.refresh");

    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}