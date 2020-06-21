import { config } from '../../shared/config';
import { AWSRegions } from '../../shared/models/region';
import { Dialog } from '../../shared/ui/dialog';
import { CodeDeployUtil } from '../../shared/aws/codedeploy';
import { commands, window, workspace } from 'vscode';
import { DialogInput } from '../../shared/ui/input';

/**
 * Link workspace to existing application
 */
export async function selectApplication() {

    if (workspace.workspaceFolders) {
        await addExistingApplication();
        commands.executeCommand("cdExplorer.refresh");
    }
    else {
        const openWorkspace = await window.showInformationMessage("Active workspace required to link with CodeDeploy.\n Would you like to open a workspace",
            "Open Workspace", "Later");
        if (openWorkspace === "Open Workspace") {
            const success = await commands.executeCommand('vscode.openFolder');
            if (success) {
                selectApplication();
            }
        }
    }
}

async function addExistingApplication() {

    try {
        const dialog = new Dialog("Link Workspace to Application");

        dialog.addPrompt("region", () => {
            return DialogInput.showQuickPick(AWSRegions.toPickItemArray(), {
                step: 1,
                title: dialog.title,
                totalSteps: dialog.prompts.length,
                canPickMany: false,
                ignoreFocusOut: true,
                placeHolder: "Select AWS Region"
            });
        });

        dialog.addPrompt("applicationName", async () => {
            await config.update("region", await dialog.getResponse("region"));
            const codedeploy = new CodeDeployUtil();
            const applications = await codedeploy.getApplicationPickItems();

            return await DialogInput.showQuickPick(applications, {
                step: 2,
                totalSteps: dialog.prompts.length,
                title: dialog.title,
                canPickMany: false,
                ignoreFocusOut: true,
                placeHolder: applications.length > 0 ? "Select AWS CodeDeploy Application" : `No CodeDeploy Applications Found in ${config.get("region")}`,
            });
        });

        await dialog.run();
        if (!dialog.cancelled) {
            await config.update("applicationName", dialog.getResponse("applicationName"));
        } else {
            await config.update("region", undefined);
        }

    }
    catch (error) {
        await config.update("region", undefined);
        await config.update("applicationName", undefined);
        window.showErrorMessage(error.message, {});
    }
}
