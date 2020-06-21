import { CodeDeployUtil } from '../../shared/aws/codedeploy';
import { config } from '../../shared/config';
import { ProgressLocation, commands, TreeItem, window } from 'vscode';

/**
 * Remove loadBalancerInfo from Deployment Group
 * @param node LoadBalancer (elb_|tg_) Info Node
 */
export async function removeELB(node: TreeItem) {
    const codedeploy = new CodeDeployUtil();
    const deploymentGroupName = node.id.substr(node.id.indexOf('_') + 1, node.id.length);

    try {
        const params = {
            loadBalancerInfo: {},
            currentDeploymentGroupName: deploymentGroupName,
            applicationName: config.get("applicationName")
        };

        return window.withProgress(
            {
                cancellable: false,
                title: `Removing ELB from Deployment Group: \'${deploymentGroupName}\'`,
                location: ProgressLocation.Notification
            }, async () => {
                await codedeploy.updateDeploymentGroup(params);
                commands.executeCommand("cdExplorer.refresh");
            }
        );
    } catch (error) {
        window.showErrorMessage(error, {});
    }
}