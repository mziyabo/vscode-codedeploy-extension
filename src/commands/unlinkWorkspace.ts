import { window, commands } from 'vscode';
import { config } from '../shared/config';

/**
 * Unlink Application from workspace
 */
export async function unlinkWorkspace() {

    try {
        const settings = [
            "deploymentGroupName",
            "revisionBucket",
            "revisionLocalDirectory",
            // "isApplicationWorkspace",
            "applicationName",
            "region",
        ];
        settings.forEach(async (setting) => {
            await config.update(setting, undefined);
        });

        await config.update("isApplicationWorkspace", false);
        commands.executeCommand("cdExplorer.refresh");

    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}