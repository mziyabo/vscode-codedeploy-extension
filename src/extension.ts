'use strict';
import * as vscode from 'vscode';
import { CDExtension } from './commands/commands';

export async function activate(context: vscode.ExtensionContext) {
    vscode.window.withProgress({
        cancellable: false,
        title: "Activating AWS CodeDeploy extension",
        location: vscode.ProgressLocation.Window
    },
        async (progress, token) => {

            let cdExtension: CDExtension = new CDExtension();
            cdExtension.Activate();
        })

}

export function deactivate() {
}