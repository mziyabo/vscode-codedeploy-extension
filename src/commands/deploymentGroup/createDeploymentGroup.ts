import { addTargetsHint } from '../addTargetsHint';
import { Dialog } from '../../shared/ui/dialog';
import { IAMUtil } from '../../shared/aws/iam';
import { config } from '../../shared/config';
import { CodeDeployUtil } from '../../shared/aws/codedeploy';
import { ProgressLocation, commands, window } from 'vscode';
import { DialogInput } from '../../shared/ui/input';

/**
 * Create CodeDeploy DpeloymentGroup
 */
export async function createDeploymentGroup() {

    const iamUtil = new IAMUtil();
    const codedeploy = new CodeDeployUtil();

    try {
        const dialog: Dialog = new Dialog("Create Deployment Group");

        dialog.addPrompt("deploymentGroupName", async () => {

            return await DialogInput.showInputBox("Enter Deployment Group Name", {
                ignoreFocusOut: true,
                step: 1,
                totalSteps: dialog.prompts.length,
                title: dialog.title,
                placeHolder: `E.g. ${config.get("applicationName")}-Dev`
            });
        });

        dialog.addPrompt("serviceRoleArn", async () => {

            return await DialogInput.showQuickPick(await iamUtil.getRolesAsQuickPickItems(), {
                step: 2,
                totalSteps: dialog.prompts.length,
                title: dialog.title,
                canPickMany: false,
                ignoreFocusOut: true,
                placeHolder: "Select CodeDeploy Service Role:"
            });
        });

        await dialog.run();

        if (!dialog.cancelled) {

            // CreateDeploymentGroup
            const params = {
                applicationName: config.get("applicationName"),
                deploymentGroupName: dialog.getResponse("deploymentGroupName"),
                serviceRoleArn: dialog.getResponse("serviceRoleArn")
            };

            return window.withProgress({
                cancellable: false,
                title: `Creating Deployment Group: \'${dialog.getResponse("deploymentGroupName")}\'`,
                location: ProgressLocation.Notification
            }, async () => {
                const response = await codedeploy.createDeploymentGroup(params);

                if (response) {
                    addTargetsHint(response.deploymentGroupName);
                }
                commands.executeCommand("cdExplorer.refresh");
                return {
                    data: response,
                    deploymentGroupName: dialog.getResponse("deploymentGroupName")
                };
            });
        }
    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}
