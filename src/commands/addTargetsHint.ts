import { addASG } from './deploymentGroup/addASG';
import { addEC2Tag } from './deploymentGroup/addEC2Tag';
import { commands, window } from 'vscode';

/**
 * Provides Hint via InformationMessage to add Deployment Targets
 * @param deploymentGroup Deployment Group Name
 */
export async function addTargetsHint(deploymentGroup) {

    try {
        if (deploymentGroup) {
            commands.executeCommand("cdExplorer.refresh");
            if (deploymentGroup) {
                const hintResponse = await window.showInformationMessage(`Add targets for ${deploymentGroup.deploymentGroupName}`, "Add AutoScaling Group", "Add EC2 Tag Filters", "Not Now");

                switch (hintResponse) {

                    case "Add AutoScaling Group":
                        addASG(deploymentGroup);
                        commands.executeCommand("cdExplorer.refresh");
                        break;

                    case "Add EC2 Tag Filters":
                        addEC2Tag(deploymentGroup);
                        commands.executeCommand("cdExplorer.refresh");
                        break;
                }
            }
        }
    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}