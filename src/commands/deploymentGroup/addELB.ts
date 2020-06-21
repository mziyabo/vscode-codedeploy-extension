import { ELBUtil } from '../../shared/aws/elb';
import { config } from '../../shared/config';
import { CodeDeployUtil } from '../../shared/aws/codedeploy';
import { Dialog } from '../../shared/ui/dialog';
import { QuickPickItem, DialogInput } from '../../shared/ui/input';
import { TreeItem, window, ProgressLocation, commands } from 'vscode';

/**
 * Update Deployment Group LoadBalancerInfo
 * @param node LoadBalancer TreeItem
 */
export async function addLoadBalancerInfo(node: TreeItem) {

    const elb = new ELBUtil();
    const codedeploy = new CodeDeployUtil();
    const deploymentGroup = node.id.substr(node.id.indexOf('_') + 1, node.id.length);

    try {
        const deploymentOptions = [
            new QuickPickItem({ label: "ELB", description: "Add ClassicLoadBalancer with Deployment Group" }),
            new QuickPickItem({ label: "TargetGroups", description: "Add ALB/NLB Target" })
        ];

        const loadBalancerChoice: any = await window.showQuickPick(deploymentOptions, {
            canPickMany: false,
            ignoreFocusOut: true,
            placeHolder: "Select ELB to add ClassicLoadBalancer; TargetGroups for ALB/NLB",
        });

        if (loadBalancerChoice) {

            const params = {
                loadBalancerInfo: {},
                applicationName: config.get("applicationName"),
                currentDeploymentGroupName: deploymentGroup,
                deploymentStyle: {}
            };

            // ClassicLoadBalancer Dialog
            if (loadBalancerChoice?.label === "ELB") {

                const elbPickItems = await elb.getLoadBalancers();
                const elbDialog = addELBDialog(elbPickItems);
                await elbDialog.run();

                if (!elbDialog.cancelled) {

                    const deploymentOption = elbDialog.getResponse("deploymentOption");
                    const deploymentType = elbDialog.getResponse("deploymentType");

                    window.withProgress({
                        cancellable: false,
                        title: `Adding LoadBalancer to Deployment Group ${deploymentGroup}`,
                        location: ProgressLocation.Notification
                    },
                        async () => {
                            const elb = elbDialog.getResponse("elb");
                            params.loadBalancerInfo = {
                                elbInfoList: [{ name: elb }]
                            };
                            params.deploymentStyle = {
                                deploymentOption: deploymentOption,
                                deploymentType: deploymentType
                            };
                            const updateresponse = await codedeploy.updateDeploymentGroup(params);
                            return updateresponse;
                        }
                    );
                }
            }
            // TargetGroup Dialog
            else {
                const targetGroups = await elb.getTargetGroups();
                const targetGroupDialog = addTargetGroupDialog(targetGroups);
                await targetGroupDialog.run();

                if (!targetGroupDialog.cancelled) {

                    const deploymentOption = targetGroupDialog.getResponse("deploymentOption");
                    const deploymentType = targetGroupDialog.getResponse("deploymentType");

                    window.withProgress({
                        cancellable: false,
                        title: `Adding TargetGroup to Deployment Group ${deploymentGroup}`,
                        location: ProgressLocation.Notification
                    }, async () => {
                        const targetGroup = targetGroupDialog.getResponse("targetGroup");

                        params.loadBalancerInfo = {
                            targetGroupInfoList: targetGroup ? [{ name: targetGroup }] : [],
                        };
                        params.deploymentStyle = {
                            deploymentOption: deploymentOption,
                            deploymentType: deploymentType
                        };

                        const updateresponse = await codedeploy.updateDeploymentGroup(params);
                        return updateresponse;
                    });
                }
            }

            commands.executeCommand("cdExplorer.refresh");
        }
    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}

/**
 * Add CLB Dialog to loadBalancerInfo
 * @param elbQuickPickItems loadBalancerInfo ClassicLoadBalancers
 */
function addELBDialog(elbQuickPickItems: QuickPickItem[]): Dialog {
    const dialog = new Dialog("Edit Load Balancer Info");
    const totalSteps = 3;

    dialog.addPrompt("elb", () => {
        return DialogInput.showQuickPick(elbQuickPickItems, {
            step: 1,
            totalSteps: totalSteps,
            title: dialog.title,
            placeHolder: elbQuickPickItems.length > 0 ?
                "Select Load Balancer" : `No Load Balancers found in ${config.get("region")}`,
            canPickMany: false,
            ignoreFocusOut: true
        });
    });

    dialog.addPrompt("deploymentOption", () => {
        const deploymentOptions = [
            new QuickPickItem({ label: "WITH_TRAFFIC_CONTROL", description: "- route deployment traffic behind a load balancer", picked: true }),
            new QuickPickItem({ label: "WITHOUT_TRAFFIC_CONTROL", description: "- ignore any settings specified in LoadBalancerInfo" })
        ];

        return DialogInput.showQuickPick(deploymentOptions, {
            step: 2,
            totalSteps: totalSteps,
            placeHolder: "Select Deployment Option",
            canPickMany: false,
            ignoreFocusOut: true,
            title: dialog.title
        });
    });

    dialog.addPrompt("deploymentType", () => {

        const deploymentTypes = [
            new QuickPickItem({ label: "IN_PLACE", description: "- in-place deployment" }),
            new QuickPickItem({ label: "BLUE_GREEN", description: "- instances in a deployment group (the original environment) are replaced by a different set of instances" })
        ];

        return DialogInput.showQuickPick(deploymentTypes, {
            step: 3,
            totalSteps: totalSteps,
            placeHolder: "Select Deployment Type",
            canPickMany: false,
            ignoreFocusOut: true,
            title: dialog.title
        });
    });

    return dialog;
}

/**
 * Add TargetGroups to loadBalancerInfo
 * @param targetGroups loadBalancerInfo TargetGroups
 */
function addTargetGroupDialog(targetGroups: any): Dialog {
    const dialog = new Dialog("Edit Load Balancer Info");
    const totalSteps = 3;

    dialog.addPrompt("targetGroup",
        async () => {
            // TODO: check optional checking
            const tgPickItems: QuickPickItem[] = [];

            targetGroups.TargetGroups.forEach((tg) => {
                tgPickItems.push(new QuickPickItem({
                    label: tg.TargetGroupName,
                    description: `${tg.Protocol}:${tg.Port} - ${tg.TargetGroupArn}`
                }));
            });

            return DialogInput.showQuickPick(tgPickItems, {
                step: 1,
                totalSteps: totalSteps,
                title: dialog.title,
                placeHolder: "Select Target Group",
                canPickMany: false,
                ignoreFocusOut: true
            });
        });

    dialog.addPrompt("deploymentOption", () => {
        const deploymentOptions = [
            new QuickPickItem({ label: "WITH_TRAFFIC_CONTROL", description: "- route deployment traffic behind a load balancer", picked: true }),
            new QuickPickItem({ label: "WITHOUT_TRAFFIC_CONTROL", description: "- ignore any settings specified in LoadBalancerInfo" })
        ];

        return DialogInput.showQuickPick(deploymentOptions, {
            step: 2,
            totalSteps: totalSteps,
            placeHolder: "Select Deployment Option",
            canPickMany: false,
            ignoreFocusOut: true,
            title: dialog.title
        });
    });

    dialog.addPrompt("deploymentType", () => {

        const deploymentTypes = [
            new QuickPickItem({ label: "IN_PLACE", description: "- in-place deployment" }),
            new QuickPickItem({ label: "BLUE_GREEN", description: "- instances in a deployment group (the original environment) are replaced by a different set of instances" })
        ];

        return DialogInput.showQuickPick(deploymentTypes, {
            step: 3,
            totalSteps: totalSteps,
            placeHolder: "Select Deployment Type",
            canPickMany: false,
            ignoreFocusOut: true,
            title: dialog.title
        });
    });

    return dialog;
}