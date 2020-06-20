import { TreeItem, commands, ProgressLocation, window } from 'vscode';
import { config } from '../../shared/config';
import { CDDeploymentGroup } from '../../shared/models/cdmodels';
import { CodeDeployUtil } from '../../shared/aws/codedeploy';
import { Dialog } from '../../shared/ui/dialog';
import { DialogInput } from '../../shared/ui/input';

/**
 * Add EC2 Tag Filters
 * @param node EC2 Tags TreeItem Node
 */
export async function addEC2Tag(node: TreeItem) {

    const codedeploy = new CodeDeployUtil();
    const deploymentGroup = node.id.substr(node.id.indexOf('_') + 1, node.id.length);

    try {
        const dialog = new Dialog("Add EC2 Tag Filter");

        dialog.addPrompt("tagName", async () => {
            return await DialogInput.showInputBox("Enter Tag Filter Name", {
                step: 1,
                totalSteps: 2,
                title: dialog.title,
                ignoreFocusOut: true
            });
        });

        dialog.addPrompt("tagValue", async () => {
            return await DialogInput.showInputBox("Enter Tag Filter Value", {
                step: 2,
                totalSteps: 2,
                title: dialog.title,
                ignoreFocusOut: true
            });
        });

        await dialog.run();
        if (!dialog.cancelled) {

            const dg: CDDeploymentGroup = await codedeploy.getDeploymentGroup(deploymentGroup);
            const existingFilters = dg.Data.ec2TagFilters ? dg.Data.ec2TagFilters : [];

            const tagFilter = {
                Key: dialog.getResponse("tagName"),
                Value: dialog.getResponse("tagValue"),
                Type: "KEY_AND_VALUE"
            };

            existingFilters.push(tagFilter);

            const params = {
                ec2TagFilters: existingFilters,
                applicationName: config.get("applicationName"),
                currentDeploymentGroupName: deploymentGroup
            };

            const response = await window.withProgress(
                {
                    cancellable: false,
                    location: ProgressLocation.Notification,
                    title: `Adding EC2 Tag Filter ${tagFilter.Key} to ${deploymentGroup}`
                }, async () => {
                    return await codedeploy.updateDeploymentGroup(params);
                });

            if (response) {
                commands.executeCommand("cdExplorer.refresh");
            }
        }
    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}
