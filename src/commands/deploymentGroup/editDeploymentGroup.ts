import { window, commands, TreeItem } from 'vscode';
import { Dialog } from '../../shared/ui/dialog';
import { AWSClient, Service } from '../../shared/aws/awsclient';
import { DialogInput, QuickPickItem } from '../../shared/ui/input';
import { CodeDeployUtil } from '../../shared/aws/codedeploy';
import { config } from '../../shared/config';

/**
 * Edit Deployment Group Settings
 */
export async function editDeploymentGroup(node: TreeItem) {
    try {
        const dialog: Dialog = editDialog();
        const deploymentGroup = node.id.substr(node.id.indexOf('_') + 1, node.id.length);
        await dialog.run();

        if (!dialog.cancelled) {
            const params = {
                applicationName: config.get("applicationName"),
                currentDeploymentGroupName: deploymentGroup,
                deploymentConfigName: dialog.getResponse("deploymentConfigName"),
                deploymentStyle: {
                    deploymentOption: dialog.getResponse("deploymentOption"),
                    deploymentType: dialog.getResponse("deploymentType")
                }
            };
            AWSClient.executeAsync(Service.CodeDeploy, "updateDeploymentGroup", params);
            commands.executeCommand("cdExplorer.refresh");
        }
    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}

/**
 * Edit DeploymentConfiguration Dialog
 */
function editDialog(): Dialog {
    const dialog: Dialog = new Dialog("Edit Deployment Group");
    const codedeploy = new CodeDeployUtil();

    dialog.addPrompt("deploymentConfigName", async () => {
        return DialogInput.showQuickPick(await codedeploy.getDeploymentConfigurations(), {
            ignoreFocusOut: false,
            step: 1,
            title: dialog.title,
            totalSteps: dialog.prompts.length,
            placeHolder: "Select Deployment Configuration"
        });
    });

    dialog.addPrompt("deploymentOption", () => {
        const deploymentOptions = [
            new QuickPickItem({
                label: "WITH_TRAFFIC_CONTROL",
                description: "- route deployment traffic behind a load balancer", picked: true
            }),
            new QuickPickItem({
                label: "WITHOUT_TRAFFIC_CONTROL",
                description: "- ignore any settings specified in LoadBalancerInfo"
            })
        ];

        return DialogInput.showQuickPick(deploymentOptions, {
            step: 2,
            totalSteps: dialog.prompts.length,
            placeHolder: "Select Deployment Option",
            canPickMany: false,
            ignoreFocusOut: true,
            title: dialog.title
        });
    });

    dialog.addPrompt("deploymentType", () => {
        const deploymentTypes = [
            new QuickPickItem({
                label: "IN_PLACE",
                description: "- in-place deployment"
            }),
            new QuickPickItem({
                label: "BLUE_GREEN",
                description: "- instances in a deployment group (the original environment) are replaced by a different set of instances"
            })
        ];

        return DialogInput.showQuickPick(deploymentTypes, {
            step: 3,
            totalSteps: dialog.prompts.length,
            placeHolder: "Select Deployment Type",
            canPickMany: false,
            ignoreFocusOut: true,
            title: dialog.title
        });
    });

    return dialog;
}