import * as vscode from 'vscode';

export function openConsole(node: any) {
    
    let uri: string;
    let config = vscode.workspace.getConfiguration("codedeploy");

    if (config.get("isApplicationWorkspace") && node.contextValue != undefined) {
        uri = `${config.get("region")}.console.aws.amazon.com/codesuite/codedeploy`;

        switch (node.contextValue) {
            case "application":
                uri = uri + `/applications/${node.label}`;
                break;

            case "deployment":
                uri = uri + `/deployments/${node.label}`;
                break;

            case "deployments":
                uri = uri + `/deployments/`;
                break;

            case "deploymentGroup":
                uri = uri + `/applications/${config.get("applicationName")}/deployment-groups/${node.label}`;
                break;

            case "deploymentGroups":
                uri = uri + `/applications/${config.get("applicationName")}/deploymentGroups`;
                break;

            case "autoScalingGroups":
                uri = `console.aws.amazon.com/ec2/autoscaling/home?region=${config.get("region")}#AutoScalingGroups:view=details`;
                break;

            default:
                if (node.contextValue.includes("autoscaling_")) {
                    uri = `console.aws.amazon.com/ec2/autoscaling/home?region=${config.get("region")}#AutoScalingGroups:id=${node.label};view=details`;
                }
                break;
        }
    }
    else {
        uri = `console.aws.amazon.com/codesuite/codedeploy/start?`;
    }

    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse("https://" + uri));
}