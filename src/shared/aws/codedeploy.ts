import * as path from 'path';
import { config } from '../config';
import { CDDeployment, CDDeploymentGroup, CDApplication } from "../models/cdmodels";
import { Dialog } from '../ui/dialog';
import { TreeItemIcons } from '../ui/icons';
import { QuickPickItem } from '../ui/input';
import { TreeItemUtil } from '../ui/treeItemUtil';
import { AWSClient, Service } from './awsclient';
import { S3Util } from "./s3";
import {
    ThemeIcon, TreeItemCollapsibleState, TreeItem, window,
    ProgressLocation, Uri, workspace, WorkspaceEdit, Position
} from 'vscode';
import { ELBUtil } from './elb';
const nls = require('vscode-nls');
const localize = nls.loadMessageBundle();

/**
 * AWS CodeDeploy Client Proxy
 */
export class CodeDeployUtil {

    /**
     * Returns CodeDeploy Application linked to Workspace
     * @return Promise<CDApplication[]>
     */
    async getApplication(): Promise<CDApplication> {

        if (config.get("applicationName") && config.get("region")) {

            const response = await AWSClient.executeAsync(Service.CodeDeploy, "getApplication", {
                applicationName: config.get("applicationName")
            });

            if (response?.application) {
                const application = new CDApplication(response.application.applicationName, TreeItemCollapsibleState.Collapsed);
                application.description = config.get("region").toString();
                application.Data = response;
                return application;
            }
        }
    }

    /**
     * Set revision bucket and local directory to use
     */
    async configureRevisionLocations() {
        const s3: S3Util = new S3Util();
        const buckets: QuickPickItem[] = await s3.getS3BucketsAsQuickItem();
        const dialog: Dialog = new Dialog();

        dialog.addPrompt("bucket", () => {
            return window.showQuickPick(buckets, {
                canPickMany: false,
                placeHolder: "Select S3 Revision Bucket",
                ignoreFocusOut: true,
            });
        });

        dialog.addPrompt("localDir", async () => {
            return await window.showWorkspaceFolderPick({ placeHolder: "Enter Local Revision Location:", ignoreFocusOut: true });
        });

        await dialog.run();

        if (!dialog.cancelled) {
            await config.update("revisionBucket", dialog.getResponse("bucket"));
            await config.update("revisionLocalDirectory", dialog.getResponse("localDir").uri.fsPath);
        }

        return dialog.cancelled;
    }

    /**
     * Get Deployment Group
     */
    async getDeploymentGroup(deploymentGroup: string): Promise<CDDeploymentGroup> {

        if (deploymentGroup) {
            const params = {
                applicationName: config.get("applicationName"),
                deploymentGroupName: deploymentGroup
            };

            const response = await AWSClient.executeAsync(Service.CodeDeploy, "getDeploymentGroup", params);

            if (response.deploymentGroupInfo) {
                const deploymentGroup = new CDDeploymentGroup(response.deploymentGroupInfo.deploymentGroupName);
                deploymentGroup.Data = response.deploymentGroupInfo;
                return deploymentGroup;
            }
        }
    }

    async getLoadBalancerInfo(deploymentGroup: string): Promise<TreeItem[]> {

        const loadBalancerItems = [];
        const elbUtil = new ELBUtil();
        const dg = await this.getDeploymentGroup(deploymentGroup);

        const loadBalancerInfo = dg.Data.loadBalancerInfo;
        // Use Classic Load Balancer
        if (loadBalancerInfo?.elbInfoList) {
            const elbName = loadBalancerInfo.elbInfoList[0].name;

            if (elbName) {

                const elb = await elbUtil.getELB(elbName);
                const elbTreeItem = {
                    label: `${elb.name} - ${elb.Scheme}`,
                    contextValue: `elb_${deploymentGroup}`,
                    id: `elb_${deploymentGroup}`,
                    collapsibleState: TreeItemCollapsibleState.None
                };

                loadBalancerItems.push(TreeItemUtil.TreeItem(elbTreeItem));
            }
        }
        // Use TargetGroup (ALB/NLB)
        else if (loadBalancerInfo?.targetGroupInfoList) {
            const targetGroupInfo = await elbUtil.getTargetGroups(loadBalancerInfo.targetGroupInfoList[0].name);

            if (targetGroupInfo) {
                targetGroupInfo.TargetGroups.forEach((tg) => {
                    loadBalancerItems.push(TreeItemUtil.TreeItem({
                        label: `${tg.TargetGroupName}`,
                        description: `- ${tg.Protocol}:${tg.Port} - TargetType: ${tg.TargetType}`,
                        contextValue: `tg_${deploymentGroup}`,
                        id: `tg_${deploymentGroup}`,
                        tooltip: tg.TargetGroupArn,
                        collapsibleState: TreeItemCollapsibleState.None
                    }));
                });
            }
        }

        return loadBalancerItems;
    }

    /**
     * Retrieve deployments
     * @param deploymentGroup
     */
    async getDeployments(deploymentGroup: string): Promise<CDDeployment[]> {

        if (deploymentGroup) {
            const deploymentDetails: CDDeployment[] = [];

            const deploymentsParams = {
                applicationName: config.get("applicationName"),
                deploymentGroupName: deploymentGroup,
                includeOnlyStatuses: [
                    "Created",
                    "Queued",
                    "InProgress",
                    "Succeeded",
                    "Failed",
                    "Stopped",
                    "Ready"
                ]
            };

            await window.withProgress({
                cancellable: false,
                location: ProgressLocation.Window,
                title: localize(`Fetching CodeDeploy Deployments`)
            }, async () => {

                const response = await AWSClient.executeAsync(Service.CodeDeploy, "listDeployments", deploymentsParams);
                const deploymentIds: string[] = await response.deployments;

                if (deploymentIds.length > 0) {
                    const limit = (Number)(config.get("maximumDeployments"));
                    const deployments = await this.batchGetDeployments(deploymentIds.slice(0, limit));

                    for (const deployment of deployments) {
                        deployment.tooltip = `${deployment.Data.status}`;

                        switch (deployment.Data.status) {

                            case "Failed":
                                deployment.tooltip += `- ${deployment.Data.completeTime} - ${deployment.Data.errorInformation.message}`;
                                deployment.description = `- ${deployment.Data.errorInformation.message}`;
                                deployment.iconPath = TreeItemIcons.Deployment.Failed;
                                break;

                            case "Succeeded":
                                deployment.tooltip += `- ${deployment.Data.completeTime}`;
                                deployment.iconPath = TreeItemIcons.Deployment.Succeeded;
                                deployment.description = `- duration: ${(deployment.Data.completeTime - deployment.Data.createTime) / 1000}s - ${deployment.Data.completeTime}`;
                                break;

                            case "Stopped":
                                deployment.iconPath = TreeItemIcons.Deployment.Stopped;
                                break;

                            case "InProgress":
                                deployment.collapsibleState = TreeItemCollapsibleState.Collapsed;
                                break;

                            default:
                                deployment.iconPath = TreeItemIcons.Deployment.InProgress;
                                break;
                        }

                        deploymentDetails.push(deployment);
                    }
                }
            });

            return deploymentDetails;
        }
    }

    /**
     *
     * @param deploymentIds
     */
    async batchGetDeployments(deploymentIds: string[]): Promise<CDDeployment[]> {

        const deployments: CDDeployment[] = [];
        const response = await AWSClient.executeAsync(Service.CodeDeploy, "batchGetDeployments", {
            deploymentIds: deploymentIds
        });

        response.deploymentsInfo.forEach((deployment) => {
            const d: CDDeployment = new CDDeployment(deployment.deploymentId);
            d.Data = deployment;
            deployments.push(d);
        });

        return deployments.sort((a, b) => { return b.Data.createTime - a.Data.createTime; });
    }

    /**
     * Retrieves CodeDeploy Deployment
     * @param deploymentId
     */
    async getDeployment(deploymentId: string) {

        const response = await AWSClient.executeAsync(Service.CodeDeploy, "getDeployment", {
            deploymentId: deploymentId
        });

        return response;
    }

    /**
     * Displays CodeDeploy DeploymentInformation in a TextDocument for given deploymentId
     * @param deploymentId
     */
    async viewDeployment(deploymentId: any) {

        const response = await this.getDeployment(deploymentId);
        const uri = Uri.parse(`untitled:${path.join(`${deploymentId}.json`)}`);

        workspace.openTextDocument(uri).then((document) => {
            const edit = new WorkspaceEdit();
            edit.insert(uri, new Position(0, 0), JSON.stringify(response, null, "\t"));
            return workspace.applyEdit(edit).then((success) => {
                if (success) {
                    window.showTextDocument(document);
                } else {
                    window.showInformationMessage('Unknown Error');
                }
            });
        });
    }

    async getDeploymentTargetTreeItems(deploymentId: string): Promise<TreeItem[]> {

        const listResponse = await AWSClient.executeAsync(Service.CodeDeploy, "listDeploymentTargets", {
            deploymentId: deploymentId
        });

        if (listResponse?.targetIds.length > 0) {

            const batchTargetParams = {
                deploymentId: deploymentId,
                targetIds: listResponse.targetIds
            };
            const batchTargetResponse = await AWSClient.executeAsync(Service.CodeDeploy, "batchGetDeploymentTargets", batchTargetParams);
            const targets: TreeItem[] = [];

            batchTargetResponse.deploymentTargets.forEach((target) => {

                if (target.deploymentTargetType === "InstanceTarget") {

                    const treeitem = TreeItemUtil.TreeItem({
                        label: `${target.instanceTarget.targetId}`,
                        contextValue: "instanceTarget",
                        collapsibleState: TreeItemCollapsibleState.None,
                        tooltip: `${target.instanceTarget.status} - ${target.instanceTarget.lastUpdatedAt}`
                    });

                    switch (target.instanceTarget.status) {

                        case "Failed":
                            treeitem.contextValue = "instanceTarget_failed";
                            treeitem.iconPath = TreeItemIcons.Target.Failed;

                            for (const lifecycleEvent of target.instanceTarget.lifecycleEvents) {
                                if (lifecycleEvent.status === "Failed") {
                                    treeitem.tooltip = `${lifecycleEvent.lifecycleEventName} ${lifecycleEvent.status} - ${lifecycleEvent.diagnostics.errorCode}: ${lifecycleEvent.diagnostics.message}`;
                                    break;
                                }
                                else if (lifecycleEvent.status === "Skipped") {
                                    treeitem.tooltip = `${lifecycleEvent.status} lifecycle events - ${lifecycleEvent.endTime}`;
                                    break;
                                }
                            }
                            break;

                        case "Succeeded":
                            treeitem.iconPath = TreeItemIcons.Target.Succeeded;
                            break;

                        case "InProgress":
                            treeitem.iconPath = TreeItemIcons.Target.InProgress;
                            break;

                        default:
                            treeitem.iconPath = TreeItemIcons.Target.Unknown;
                            break;
                    }

                    targets.push(treeitem);
                }
            });

            return targets;
        }
    }

    async getDeploymentGroupSettings(deploymentGroup: string): Promise<TreeItem[]> {
        const dg = (await this.getDeploymentGroup(deploymentGroup)).Data;

        if (dg) {
            const props: TreeItem[] = [];

            props.push(
                TreeItemUtil.TreeItem({ label: `Compute Platform=${dg.computePlatform}`, contextValue: "platform" }),
                TreeItemUtil.TreeItem({ label: `Deployment Config=${dg.deploymentConfigName}`, contextValue: "configuration" }),
                TreeItemUtil.TreeItem({ label: `Deployment Option=${dg.deploymentStyle.deploymentOption}`, contextValue: "option" }),
                TreeItemUtil.TreeItem({ label: `Deployment Type=${dg.deploymentStyle.deploymentType}`, contextValue: "type" })
            );

            if (dg.deploymentStyle.deploymentType === "BLUE_GREEN" && dg.blueGreenDeploymentConfiguration) {
                props.push(
                    TreeItemUtil.TreeItem({
                        label: `Green Fleet Provisioning Option=${dg.blueGreenDeploymentConfiguration.greenFleetProvisioningOption.action}`,
                        contextValue: "action"
                    }),
                    TreeItemUtil.TreeItem({
                        label: `Terminate On Deployment Success=${dg.blueGreenDeploymentConfiguration.terminateBlueInstancesOnDeploymentSuccess.action}`,
                        contextValue: "action",
                        tooltip: `Termination WaitTime (Minutes): ${dg.blueGreenDeploymentConfiguration.terminateBlueInstancesOnDeploymentSuccess.terminationWaitTimeInMinutes}`
                    }),
                );
            }

            props.forEach((prop) => {
                prop.iconPath = new ThemeIcon("symbol-constant");
                prop.collapsibleState = TreeItemCollapsibleState.None;
            });

            props.push(
                TreeItemUtil.TreeItem({
                    label: "LoadBalancer Info",
                    contextValue: "loadBalancer",
                    iconPath: new ThemeIcon("file-directory"),
                    id: `elbInfo_${deploymentGroup}`
                }),
                // TreeItemUtil.TreeItem({
                //     label: "Blue Green Configuration",
                //     contextValue: "blueGreen",
                //     iconPath: new ThemeIcon("file-directory"),
                //     id: `blueGreen_${deploymentGroup}`
                // })
            );

            return props;
        }
    }

    async getDeploymentGroupTreeItem(deploymentGroup: string): Promise<TreeItem[]> {

        if (await this.getDeploymentGroup(deploymentGroup)) {
            const treeItemOptions = [];

            treeItemOptions.push(
                {
                    label: "DeploymentGroup Info",
                    contextValue: "dgSettings",
                    id: `settings_${deploymentGroup}`,
                    iconPath: new ThemeIcon("symbol-property"),
                    collapsibleState: TreeItemCollapsibleState.Expanded
                },
                {
                    label: "EC2 Tag Filters",
                    contextValue: "ec2TagFilters",
                    id: `tags_${deploymentGroup}`
                },
                {
                    label: "Auto Scaling Groups",
                    contextValue: "autoScalingGroups",
                    id: `autoscaling_${deploymentGroup}`
                },
                {
                    label: "Deployments",
                    contextValue: "deployments",
                    id: `deployment_${deploymentGroup}`,
                    tooltip: `- last ${config.get("maximumDeployments")}. Use 'Maximum Deployments' setting to adjust.`
                }
            );

            const deployGroupItems: TreeItem[] = [];
            treeItemOptions.forEach((options) => {
                deployGroupItems.push(TreeItemUtil.TreeItem(options));
            });

            return deployGroupItems;
        }
    }

    async getDeploymentGroupsTreeItems(): Promise<TreeItem[]> {

        const deploymentGps: TreeItem[] = [];
        const response = await AWSClient.executeAsync(Service.CodeDeploy, "listDeploymentGroups", {
            applicationName: config.get("applicationName")
        });

        if (response.deploymentGroups.length > 0) {
            response.deploymentGroups.forEach((deploymentGroup) => {
                const treeItem: TreeItem = new TreeItem(deploymentGroup, TreeItemCollapsibleState.Collapsed);
                treeItem.contextValue = "deploymentGroup";

                deploymentGps.push(treeItem);
            });
            return deploymentGps;
        }
        else {
            const createDGpHint: TreeItem = new TreeItem("-> Create Deployment Group", TreeItemCollapsibleState.None);
            createDGpHint.command = {
                command: "cdExplorer.createDeploymentGroup",
                title: "Create Deploment Group"
            };
            return [createDGpHint];
        }
    }

    async listEC2TagFilters(deploymentGroup: string) {

        const dg = (await this.getDeploymentGroup(deploymentGroup)).Data;
        const tagFilters: TreeItem[] = [];

        if (dg.ec2TagFilters) {
            dg.ec2TagFilters.forEach((ec2Tag) => {
                const treeItem = new TreeItem(`${ec2Tag.Key}=${ec2Tag.Value}`, TreeItemCollapsibleState.None);

                treeItem.iconPath = TreeItemIcons.EC2Tag;
                treeItem.contextValue = `ec2TagFilter_${deploymentGroup}`;
                treeItem.id = `${deploymentGroup}_${ec2Tag.Key}`;

                tagFilters.push(treeItem);
            });
        }
        else if (dg.ec2TagSet) {
            dg.ec2TagSet.ec2TagSetList.forEach((ec2TagList) => {

                ec2TagList.forEach((ec2Tag) => {
                    const treeItem = new TreeItem(`${ec2Tag.Key}=${ec2Tag.Value}`, TreeItemCollapsibleState.None);

                    treeItem.iconPath = TreeItemIcons.EC2Tag;
                    treeItem.contextValue = `ec2TagFilter_${deploymentGroup}`;
                    treeItem.id = `${deploymentGroup}_${ec2Tag.Key}`;

                    tagFilters.push(treeItem);
                });
            });
        }

        return tagFilters;
    }

    async getApplicationPickItems() {

        const quickPickItems: QuickPickItem[] = [];

        await window.withProgress({
            cancellable: false,
            location: ProgressLocation.Notification,
            title: localize(`Fetching CodeDeploy Applications in ${config.get("region")}`)
        }, async () => {

            const listResponse = await AWSClient.executeAsync(Service.CodeDeploy, "listApplications", {});

            if (listResponse.applications) {

                if (listResponse.applications.length > 0) {
                    const batchResponse = await AWSClient.executeAsync(Service.CodeDeploy, "batchGetApplications", { applicationNames: listResponse.applications });

                    batchResponse.applicationsInfo.forEach((appInfo) => {
                        // Limited to CodeDeploy EC2
                        if (appInfo.computePlatform === "Server") {
                            quickPickItems.push(
                                new QuickPickItem({
                                    label: appInfo.applicationName,
                                    description: ""
                                })
                            );
                        }
                    });
                }
            }
        });

        return quickPickItems;
    }

    async getAutoScalingGroups(deploymentGroup: string): Promise<TreeItem[]> {

        const asgs: TreeItem[] = [];
        const dg = await this.getDeploymentGroup(deploymentGroup);

        dg.Data.autoScalingGroups.forEach((asg) => {
            const treeItem = new TreeItem(asg.name, TreeItemCollapsibleState.None);
            treeItem.contextValue = `autoscaling_${deploymentGroup}`;
            asgs.push(treeItem);
        });

        return asgs;
    }

    /**
    * Retrieve TreeItems for Application contextValues
    */
    getApplicationTreeItems() {
        try {
            return [TreeItemUtil.TreeItem({
                label: "Deployment Groups",
                contextValue: "deploymentGroups"
            })];

        } catch (error) {
            window.showErrorMessage(error.message, {});
        }
    }

    /**
     * Retrieve DeploymentConfigurations
     */
    async getDeploymentConfigurations(): Promise<QuickPickItem[]> {
        try {
            const deploymentConfigurations: QuickPickItem[] = [];
            const response = await AWSClient.executeAsync(Service.CodeDeploy, "listDeploymentConfigs", {});

            response.deploymentConfigsList.forEach((deploymentConfiguration) => {
                deploymentConfigurations.push(new QuickPickItem({
                    label: deploymentConfiguration,
                    description: ""
                }));
            });

            return deploymentConfigurations;

        } catch (error) {
            window.showErrorMessage(error.message, {});
        }
    }

    async getBGConfiguration(deploymentGroup: string): Promise<TreeItem[]> {
        const dg = (await this.getDeploymentGroup(deploymentGroup)).Data;

        if (dg.blueGreenDeploymentConfiguration) {
            const props: TreeItem[] = [];
            const bg = dg.blueGreenDeploymentConfiguration;

            props.push(
                TreeItemUtil.TreeItem({
                    label: `Action On Timeout=${bg.deploymentReadyOption.actionOnTimeout}`,
                    contextValue: "actionOnTimeout"
                }),
                TreeItemUtil.TreeItem({
                    label: `Wait Time(Minutes)=${bg.deploymentReadyOption.waitTimeInMinutes}`,
                    contextValue: "waitTimeInMinutes"
                }),
                TreeItemUtil.TreeItem({
                    label: `Green Fleet Provisioning Option=${bg.greenFleetProvisioningOption.action}`,
                    contextValue: "action"
                }),
                TreeItemUtil.TreeItem({
                    label: `Terminate On Deployment Success=${bg.terminateBlueInstancesOnDeploymentSuccess.action}`,
                    contextValue: "action"
                }),
                TreeItemUtil.TreeItem({
                    label: `Termination Wait Time(Minutes)=${bg.terminateBlueInstancesOnDeploymentSuccess.terminationWaitTimeInMinutes}`,
                    contextValue: "terminationWaitTimeInMinutes"
                }),
            );
            props.forEach((prop) => {
                prop.iconPath = new ThemeIcon("symbol-constant");
                prop.collapsibleState = TreeItemCollapsibleState.None;
            });

            return props;
        }
    }

    async createApplication(params: {}) {
        return await AWSClient.executeAsync(Service.CodeDeploy, "createApplication", params);
    }

    async deleteApplication(params: {}) {
        return await AWSClient.executeAsync(Service.CodeDeploy, "deleteApplication", params);
    }

    async createDeployment(params: {}) {
        return await AWSClient.executeAsync(Service.CodeDeploy, "createDeployment", params);
    }

    async waitForDeployment(params: {}, callback: any) {
        return await AWSClient.waitForAsync(Service.CodeDeploy, "deploymentSuccessful", params, callback);
    }

    async stopDeployment(params: {}) {
        return await AWSClient.executeAsync(Service.CodeDeploy, "stopDeployment", params);
    }

    async createDeploymentGroup(params: {}) {
        return await AWSClient.executeAsync(Service.CodeDeploy, "createDeploymentGroup", params);
    }

    async deleteDeploymentGroup(params: {}) {
        return await AWSClient.executeAsync(Service.CodeDeploy, "deleteDeploymentGroup", params);
    }

    async execute(operation: string, params: {}) {
        return await AWSClient.executeAsync(Service.CodeDeploy, operation, params);
    }

    async updateDeploymentGroup(params: any) {
        return await AWSClient.executeAsync(Service.CodeDeploy, "updateDeploymentGroup", params);
    }
}