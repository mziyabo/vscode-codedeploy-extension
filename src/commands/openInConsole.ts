import { config } from '../shared/config';
import { commands, Uri, window } from 'vscode';

/**
 * Open TreeItem element in AWS Console
 * @param node
 */
export function openConsole(node: any) {

    try {
        if (config.get("isApplicationWorkspace") && node.contextValue !== undefined) {
            const region = config.get("region");
            const application = config.get("applicationName");

            let uri = `${config.get("region")}.console.aws.amazon.com/codesuite/codedeploy`;
            switch (node.contextValue) {
                case "application":
                    uri = `${uri}/applications/${node.label}`;
                    break;
                case "deployment":
                    uri = `${uri}/deployments/${node.label}`;
                    break;
                case "deployments":
                    uri = `${uri}/deployments/`;
                    break;
                case "deploymentGroup":
                    uri = `${uri}/applications/${application}/deployment-groups/${node.label}`;
                    break;
                case "deploymentGroups":
                    uri = `${uri}/applications/${application}/deploymentGroups`;
                    break;
                case "autoScalingGroups":
                    uri = `console.aws.amazon.com/ec2/autoscaling/home?region=${region}#AutoScalingGroups:view=details`;
                    break;
                default:
                    if (node.contextValue.includes("autoscaling_")) {
                        uri = `console.aws.amazon.com/ec2/autoscaling/home?region=${region}#AutoScalingGroups:id=${node.label};view=details`;
                    }
                    break;
            }
            commands.executeCommand('vscode.open', Uri.parse(`https://${uri}`));
        }
        else {
            commands.executeCommand('vscode.open', Uri.parse(`https://console.aws.amazon.com/codesuite/codedeploy/start?`));
        }

    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}