import { workspace } from 'vscode';

/**
 * vscode Workspace Configuration Helper
 */
export class config {
    static get(setting: string) {
        return workspace.getConfiguration("codedeploy").get(setting);
    }

    static async update(section: string, value: any) {
        return await workspace.getConfiguration("codedeploy").update(section, value);
    }
}