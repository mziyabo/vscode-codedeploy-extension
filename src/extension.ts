'use strict';
import { CDExtension } from './commands/commands';
import { ExtensionContext, ProgressLocation, window } from 'vscode';

export async function activate(context: ExtensionContext) {

    window.withProgress({
        cancellable: false,
        title: "Activating AWS CodeDeploy Extension",
        location: ProgressLocation.Window
    },
        async (progress, token) => {
            const extension = new CDExtension();
            extension.activate();
        });
}

export function deactivate() {
}