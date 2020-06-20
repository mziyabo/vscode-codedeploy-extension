import { TreeItem, ProgressLocation, commands, window } from 'vscode';
import { config } from '../../shared/config';
import { CodeDeployUtil } from '../../shared/aws/codedeploy';

export async function deleteDeploymentGroup(node: TreeItem) {

    const codedeploy = new CodeDeployUtil();
    const deploymentGroupName = node.label;

    try {
        const confirmDelete = await window.showInformationMessage(`Are you sure you want to delete ${deploymentGroupName}?`, { modal: true }, "Delete");

        if (confirmDelete === "Delete") {
            const params = {
                applicationName: config.get("applicationName"),
                deploymentGroupName: deploymentGroupName
            };

            await window.withProgress(
                {
                    cancellable: false,
                    location: ProgressLocation.Notification,
                    title: `Deleting Deployment Group ${deploymentGroupName}`
                },
                async () => {
                    await codedeploy.deleteDeploymentGroup(params);
                    commands.executeCommand("cdExplorer.refresh");
                }
            );
        }
    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}