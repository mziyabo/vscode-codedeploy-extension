import { TreeItem, window, commands, ProgressLocation } from 'vscode';
import { AutoScalingUtil } from '../../shared/aws/autoscaling';
import { config } from '../../shared/config';
import { CodeDeployUtil } from '../../shared/aws/codedeploy';

/**
 * Add Autoscaling Group to Deployment Group
 * @param node Autoscaling Folder Node
 */
export async function addASG(node: TreeItem) {

    const codedeploy = new CodeDeployUtil();
    const autoscaling = new AutoScalingUtil();
    const deploymentGroup = node.id.substr(node.id.indexOf('_') + 1, node.id.length);

    try {
        const pickItems = await autoscaling.getASGQuickPickItems();
        const picks = await window.showQuickPick(pickItems, {
            placeHolder: pickItems.length > 0 ? "Select AutoScaling Groups:" : `No AutoScaling Groups found in ${config.get("region")}`,
            canPickMany: true,
            ignoreFocusOut: true
        });

        if (picks) {
            const autoScalingGroups = [];
            picks.forEach((item) => {
                autoScalingGroups.push(item.label);
            });

            return window.withProgress({
                cancellable: false,
                title: `Adding ASG(s) to Deployment Group ${deploymentGroup}`,
                location: ProgressLocation.Notification
            }, () => {
                const params = {
                    autoScalingGroups: autoScalingGroups,
                    applicationName: config.get("applicationName"),
                    currentDeploymentGroupName: deploymentGroup
                };

                const updateresponse = codedeploy.updateDeploymentGroup(params);
                commands.executeCommand("cdExplorer.refresh");
                return updateresponse;
            });
        }
    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}