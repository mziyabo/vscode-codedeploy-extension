
import { config } from '../../shared/config';
import { CodeDeployUtil } from '../../shared/aws/codedeploy';
import { TreeItem, ProgressLocation, commands, window } from 'vscode';

/**
 * Remove Autoscaling Group from Deployment Group
 * @param node Autoscaling Group Node
 */
export async function removeASG(node: TreeItem) {

    const codedeploy = new CodeDeployUtil();
    let autoscalingGroupName;
    let deploymentGroupName;

    try {
        if (node) {
            autoscalingGroupName = node.label;
            deploymentGroupName = node.contextValue.substr(node.contextValue.indexOf('_') + 1, node.contextValue.length);

            const dg = await codedeploy.getDeploymentGroup(deploymentGroupName);

            if (dg.Data?.autoScalingGroups) {
                const autoScalingGroups = dg.Data.autoScalingGroups.filter((asg) => { return asg.name !== autoscalingGroupName; });

                const params = {
                    autoScalingGroups: autoScalingGroups.map((asg) => { return asg.name; }),
                    currentDeploymentGroupName: deploymentGroupName,
                    applicationName: config.get("applicationName")
                };

                return window.withProgress(
                    {
                        cancellable: false,
                        title: `Removing  Deployment Group: \'${deploymentGroupName}\' ASG ${autoscalingGroupName}`,
                        location: ProgressLocation.Notification
                    }, async () => {
                        await codedeploy.updateDeploymentGroup(params);
                        commands.executeCommand("cdExplorer.refresh");
                    }
                );
            }
        }
    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}
