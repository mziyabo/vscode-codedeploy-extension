import { window, commands, TreeItem } from 'vscode';
import { Dialog, PromptAction } from '../../shared/ui/dialog';
import { AWSClient, Service } from '../../shared/aws/awsclient';
import { QuickPickItem, DialogInput } from '../../shared/ui/input';
import { config } from '../../shared/config';
import { AutoScalingUtil } from '../../shared/aws/autoscaling';

export async function configureBGDeployment(node: TreeItem) {
    try {
        const dialog: Dialog = await configureDialog();
        const deploymentGroup = node.id.substr(node.id.indexOf('_') + 1, node.id.length);
        await dialog.run();

        if (!dialog.cancelled) {

            const params = {
                applicationName: config.get("applicationName"),
                currentDeploymentGroupName: deploymentGroup,
                blueGreenDeploymentConfiguration: {
                    deploymentReadyOption: {
                        actionOnTimeout: dialog.getResponse("actionOnTimeout"),
                        waitTimeInMinutes: dialog.getResponse("waitTimeInMinutes")
                    },
                    greenFleetProvisioningOption: {
                        action: dialog.getResponse("greenFleetProvisioningOption")
                    },
                    terminateBlueInstancesOnDeploymentSuccess: {
                        action: dialog.getResponse("blueTerminateAction"),
                        terminationWaitTimeInMinutes: dialog.getResponse("terminationWaitTimeInMinutes")
                    }
                },
                autoScalingGroups: dialog.getResponse("asg") ? [dialog.getResponse("asg")] : []
            };

            AWSClient.executeAsync(Service.CodeDeploy, "updateDeploymentGroup", params);
            commands.executeCommand("cdExplorer.refresh");
        }
    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}

/**
 * Configure Blue/Green Dialog
 */
async function configureDialog(): Promise<Dialog> {
    const dialog: Dialog = new Dialog("Configure Blue/Green Deployments");

    dialog.addPrompt("actionOnTimeout", () => {
        const actions: QuickPickItem[] = [
            new QuickPickItem({ label: "CONTINUE_DEPLOYMENT", description: "- Register new instances with the load balancer immediately after the new application revision is installed." }),
            new QuickPickItem({ label: "STOP_DEPLOYMENT", description: "- Do not register new instances with a load balancer unless traffic rerouting is started using ContinueDeployment." })
        ];

        return DialogInput.showQuickPick(actions, {
            ignoreFocusOut: true,
            step: 1,
            title: dialog.title,
            totalSteps: dialog.prompts.length,
            placeHolder: "Select Deployment Ready Action On Timeout"
        });
    });

    dialog.addPrompt("waitTimeInMinutes", () => {

        const action = dialog.getResponse("actionOnTimeout");
        if (action !== "STOP_DEPLOYMENT") { return PromptAction[PromptAction.MoveNext]; }
        return DialogInput.showInputBox("Enter Deployment Ready Wait Time(minutes)", {
            ignoreFocusOut: true,
            step: 2,
            title: dialog.title,
            totalSteps: dialog.prompts.length
        });
    });

    dialog.addPrompt("greenFleetProvisioningOption", () => {
        const provisionOptions: QuickPickItem[] = [
            new QuickPickItem({ label: "DISCOVER_EXISTING", description: "- Use instances that already exist or will be created manually." }),
            new QuickPickItem({ label: "COPY_AUTO_SCALING_GROUP", description: "- Use settings from a specified Auto Scaling group to define and create instances." })
        ];

        return DialogInput.showQuickPick(provisionOptions, {
            ignoreFocusOut: true,
            step: 3,
            title: dialog.title,
            totalSteps: dialog.prompts.length,
            placeHolder: "Select Green Fleet Provisioning Option"
        });
    });

    dialog.addPrompt("asg", async () => {
        if (dialog.getResponse("greenFleetProvisioningOption") !== "COPY_AUTO_SCALING_GROUP") { return PromptAction[PromptAction.MoveNext]; }
        const autoscaling = new AutoScalingUtil();
        const pickItems = await autoscaling.getASGQuickPickItems();
        return DialogInput.showQuickPick(pickItems, {
            step: 4,
            title: dialog.title,
            totalSteps: dialog.prompts.length,
            placeHolder: pickItems.length > 0 ? "Select AutoScaling Groups:" : `No AutoScaling Groups found in ${config.get("region")}`,
            ignoreFocusOut: true,
            canPickMany: false,
        });
    });

    dialog.addPrompt("blueTerminateAction", () => {
        const terminationOptions: QuickPickItem[] = [
            new QuickPickItem({ label: "TERMINATE", description: "- Instances are terminated after a specified wait time" }),
            new QuickPickItem({ label: "KEEP_ALIVE", description: "- Instances are left running after they are deregistered from the load balancer and removed from the deployment group." })
        ];

        return DialogInput.showQuickPick(terminationOptions, {
            ignoreFocusOut: true,
            step: 5,
            title: dialog.title,
            totalSteps: dialog.prompts.length,
            placeHolder: "Select Blue Fleet Termination Action OnDeploymentSuccess"
        });
    });

    dialog.addPrompt("terminationWaitTimeInMinutes", () => {
        return DialogInput.showInputBox("Enter Termination Wait Time (minutes)", {
            ignoreFocusOut: true,
            step: 6,
            title: dialog.title,
            totalSteps: dialog.prompts.length
        });
    });

    return dialog;
}