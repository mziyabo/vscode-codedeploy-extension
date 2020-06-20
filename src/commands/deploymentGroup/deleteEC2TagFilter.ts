import { TreeItem, ProgressLocation, commands, window } from 'vscode';
import { config } from '../../shared/config';
import { CodeDeployUtil } from '../../shared/aws/codedeploy';

/**
 * Delete EC2 TagFilter from DeploymentGroup
 * @param node EC2 TagFilter TreeItem
 */
export async function deleteEC2TagFilter(node: TreeItem) {

    const deploymentGroup = node.contextValue.substr(node.contextValue.indexOf('_') + 1, node.contextValue.length);
    const ec2TagKey = node.id.substr(deploymentGroup.length + 1, node.id.length);

    try {
        let params;
        const codedeploy = new CodeDeployUtil();
        const dg = await codedeploy.getDeploymentGroup(deploymentGroup);

        if (dg.Data.ec2TagFilters) {
            params = {
                ec2TagFilters: dg.Data.ec2TagFilters.filter((dg) => { return dg.Key !== ec2TagKey; }),
                currentDeploymentGroupName: deploymentGroup,
                applicationName: config.get("applicationName")
            };
        }
        else if (dg.Data.ec2TagSet) {
            const ec2TagSet = { ec2TagSetList: [] };

            dg.Data.ec2TagSet?.ec2TagSetList.forEach((ec2TagList) => {
                const tagList = ec2TagList.filter((dg) => { return dg.Key !== ec2TagKey; });
                if (tagList.length > 0) {
                    ec2TagSet.ec2TagSetList.push(tagList);
                }
            });

            params = {
                ec2TagSet: ec2TagSet,
                currentDeploymentGroupName: deploymentGroup,
                applicationName: config.get("applicationName")
            };
        }

        await window.withProgress(
            {
                cancellable: false,
                title: `Deleting ${deploymentGroup} EC2 Tag Filter ${ec2TagKey}`,
                location: ProgressLocation.Notification
            },
            async () => {
                await codedeploy.updateDeploymentGroup(params);
                console.log(`Deleted ${deploymentGroup} EC2 Tag Filter ${ec2TagKey}`);
                commands.executeCommand("cdExplorer.refresh");
            });

    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}