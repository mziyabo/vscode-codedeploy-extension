import { CodeDeployUtil } from '../../shared/aws/codedeploy';
import { ProgressLocation, commands, TreeItem, window } from 'vscode';

/**
 * Stop Deployment
 * @param node Deployment TreeItem Node
 */
export async function stopDeployment(node: TreeItem) {
    const codedeploy = new CodeDeployUtil();
    const deploymentId = node.label;

    try {
        await window.withProgress({
            cancellable: false,
            location: ProgressLocation.Window,
            title: `Stopping deployment ${deploymentId}`
        }, async () => {

            const response = await codedeploy.stopDeployment({
                deploymentId: deploymentId
            });
            if (response.Status === "Succeeded") {
                console.log(`Stopped Deployment ${deploymentId}`);
            }

            commands.executeCommand("cdExplorer.refresh");
            return response;
        });
    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}