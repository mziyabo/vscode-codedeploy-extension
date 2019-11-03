import * as vscode from 'vscode';

export class ConfigurationUtil {

    private conf = vscode.workspace.getConfiguration("codedeploy");

    constructor() {
    }

    /**
     * Retrieve value at specified key
     * @param key Configuration key name
     */
    get(key: string) {
        return this.conf.get(key);
    }

    /**
     * Update configuration key value
     * @param key Configuration Key Name
     * @param value Configuration Value
     */
    async update(key: string, value: any) {
        await this.conf.update(key, value);
    }

    async clear() {
        // TODO: implement clear all configuration settings
        throw "NotImplementedException: clear Not Implemented"
    }
}