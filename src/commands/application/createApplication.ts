import { config } from '../../shared/config';
import { AWSRegions } from '../../shared/models/region';
import { Dialog } from '../../shared/ui/dialog';
import { CodeDeployUtil } from '../../shared/aws/codedeploy';
import { DialogInput } from '../../shared/ui/input';
import { workspace, commands, window, ProgressLocation } from 'vscode';

/**
 * Create CodeDeploy Application
 */
export async function createApplication() {

    try {
        if (workspace.workspaceFolders) {
            const codedeploy = new CodeDeployUtil();
            const dialog = addApplicationDialog();

            await dialog.run();
            if (!dialog.cancelled) {

                // Update Configuration
                await config.update("region", dialog.getResponse("region"));
                await config.update("applicationName", dialog.getResponse("applicationName"));

                // Create Application
                const applicationParams = {
                    applicationName: dialog.getResponse("applicationName"),
                    computePlatform: 'Server'
                };

                return window.withProgress({
                    cancellable: false,
                    location: ProgressLocation.Notification,
                    title: `Creating CodeDeploy Application: \'${dialog.getResponse("applicationName")}\'`,
                }, async () => {
                    try {
                        return await codedeploy.createApplication(applicationParams);
                    }
                    catch (error) {
                        config.update("applicationName", undefined);
                        config.update("region", undefined);
                        throw error;
                    }
                });
            } else {
                config.update("region", undefined);
            }
            commands.executeCommand("cdExplorer.refresh");
        }
        // No workspace- prompt to open
        else {
            const openWorkspaceResponse = await window.showInformationMessage("Active workspace required to link with CodeDeploy.\n Would you like to open a workspace", "Open Workspace", "Later");
            if (openWorkspaceResponse === "Open Workspace") {
                const success = await commands.executeCommand('vscode.openFolder');
                if (success) {
                    return createApplication();
                }
            }
        }
    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}

/**
 * Create Application Dialog
 */
function addApplicationDialog() {
    const dialog: Dialog = new Dialog("Create Application");

    dialog.addPrompt("region", async () => {
        return await DialogInput.showQuickPick(AWSRegions.toPickItemArray(), {
            step: 1,
            totalSteps: dialog.prompts.length,
            canPickMany: false,
            ignoreFocusOut: true,
            title: dialog.title
        });
    });

    dialog.addPrompt("applicationName", async () => {
        return await DialogInput.showInputBox("Enter Application Name", {
            step: 2,
            totalSteps: dialog.prompts.length,
            ignoreFocusOut: true,
            title: dialog.title
        });
    });

    return dialog;
}