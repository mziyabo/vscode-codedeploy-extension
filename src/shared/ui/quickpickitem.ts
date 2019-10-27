import * as vscode from 'vscode';

export class QuickPickItem implements vscode.QuickPickItem {

    label: string;
    description?: string;
    detail?: string;
    picked?: boolean;
    alwaysShow?: boolean;

    constructor(label: string, detail: string) {
        this.label = label;
        this.description = detail;
    }
}