let AWS = require("aws-sdk");
import * as vscode from 'vscode';
import * as path from 'path';
import { Dialog } from '../../shared/ui/dialog';
import { TreeItemUtil } from '../../shared/ui/treeItemUtil';
import { QuickPickItem } from '../../shared/ui/quickpickitem';
import { S3Util } from "../s3/s3";
import { IAMUtil } from '../iam/iam';
import { AutoScalingUtil } from '../autoscaling/autoscaling';
import { AWSRegions } from '../../models/region';
import { CDApplication, CDDeploymentGroup, CDDeployment } from "../../models/cdmodels";
import { TreeItemIcons } from '../../shared/ui/icons';

export class CodeDeployUtil {

    private codedeploy;
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration("codedeploy");
        if (this.config.get("enableAwsLogging")) {
            AWS.config.logger = console;
        }
    }

    /**
     * Initialize/Update/Get/Refresh Global variables
     */
    async initClient() {
        this.config = vscode.workspace.getConfiguration("codedeploy");

        if (this.config.get("region")) {
            this.codedeploy = new AWS.CodeDeploy({
                apiVersion: '2014-10-06',
                region: this.config.get("region")
            });
        }
    }

    /**
     * Returns CodeDeploy Application for Workspace
     * @return Promise<CDApplication[]>
     */
    async getApplication(): Promise<CDApplication> {

        this.initClient();

        // Get CodeDeploy Application
        var applicationparams = {
            applicationName: this.config.get("applicationName")
        };

        let response = await this.codedeploy.getApplication(applicationparams).promise();

        if (response.application) {

            let application = new CDApplication(response.application.applicationName, vscode.TreeItemCollapsibleState.Collapsed);
            application.description = this.config.get("region");
            application.Data = response;
            return application;
        }

        return;
    }

    async addExistingApplication() {

        let dialog: Dialog = new Dialog();

        let _region = await vscode.window.showQuickPick(AWSRegions.toQuickPickItemArray(), {
            canPickMany: false,
            placeHolder: "Select AWS CodeDeploy Region",
            ignoreFocusOut: true
        });

        if (!_region) return;

        await this.config.update("region", _region.label);

        let applications = await this.getApplicationsAsQuickPickItems();

        dialog.addPrompt("_applicationName", async () => {
            return await vscode.window.showQuickPick(applications, {
                canPickMany: false,
                placeHolder: applications.length > 0 ? "Select AWS CodeDeploy Application" : `No CodeDeploy Applications Found in ${this.config.get("region")}`,
                ignoreFocusOut: true,
            });
        })

        await dialog.run();

        if (!dialog.cancelled) {
            await this.config.update("applicationName", dialog.getResponse("_applicationName"));
        }
    }

    /**
     * Create a CodeDeploy Application and Deployment Group for Workspace
     */
    async scaffoldApplication() {

        let createAppResponse = await this.createApplication();

        if (createAppResponse) {

            let createDeploymentGroupResponse = await this.createDeploymentGroup();
            // TODO: prompt to add deployment targets ec2TargetFilter/AutoScalingGroup
            if (createDeploymentGroupResponse) {
                return {
                    applicationName: this.config.get("applicationName"),
                    deploymentGroupName: createDeploymentGroupResponse.deploymentGroupName
                }
            }

        }
    }

    async createApplication() {

        let dialog: Dialog = new Dialog();

        let _region = await vscode.window.showQuickPick(AWSRegions.toQuickPickItemArray(), {
            canPickMany: false,
            placeHolder: "Select AWS CodeDeploy Region",
            ignoreFocusOut: true,
        });

        if (!_region) return;
        await this.config.update("region", _region.label);

        dialog.addPrompt("_applicationName", async () => { return await vscode.window.showInputBox({ prompt: "Enter Application Name" }) })
        await dialog.run();

        if (!dialog.cancelled) {

            // Update Configuration
            await this.config.update("applicationName", dialog.getResponse("_applicationName"));

            this.initClient();

            // CreateApplication
            var applicationParams = {
                applicationName: dialog.getResponse("_applicationName"),
                computePlatform: 'Server'
            };

            return vscode.window.withProgress(
                {
                    cancellable: false,
                    title: `Creating CodeDeploy Application: \'${dialog.getResponse("_applicationName")}\'`,
                    location: vscode.ProgressLocation.Notification
                }, async (progress, token) => {

                    let response = await this.codedeploy.createApplication(applicationParams).promise();
                    return response;
                }
            );
        }
    }

    /**
     * Create CodeDeploy DeploymentGroup
     */
    async createDeploymentGroup() {

        this.initClient();

        let iamUtil = new IAMUtil();

        let dialog: Dialog = new Dialog();

        dialog.addPrompt("_deploymentGroupName", async () => {
            return await vscode.window.showInputBox({
                prompt: "Enter Deployment Group Name",
                placeHolder: `e.g. ${this.config.get("applicationName")}-Dev`,
                ignoreFocusOut: true
            });
        });

        dialog.addPrompt("_serviceRoleArn", async () => {
            return await vscode.window.showQuickPick(iamUtil.getRolesAsQuickPickItems(), {
                canPickMany: false,
                placeHolder: "Select CodeDeploy Service Role:",
                ignoreFocusOut: true,
            });
        });

        await dialog.run();

        if (!dialog.cancelled) {

            // CreateDeploymentGroup
            var params = {
                applicationName: this.config.get("applicationName"),
                deploymentGroupName: dialog.getResponse("_deploymentGroupName"),
                serviceRoleArn: dialog.getResponse("_serviceRoleArn")
            }

            return vscode.window.withProgress({
                cancellable: false,
                title: `Creating Deployment Group: \'${dialog.getResponse("_deploymentGroupName")}\'`,
                location: vscode.ProgressLocation.Notification
            }, async (progress, token) => {
                let response = await this.codedeploy.createDeploymentGroup(params).promise();
                return {
                    data: response,
                    deploymentGroupName: dialog.getResponse("_deploymentGroupName")
                };
            });
        }
    }

    /**
     * Set revision bucket and local directory to use
     */
    async configureRevisionLocations() {

        let dialog: Dialog = new Dialog();

        let s3: S3Util = new S3Util();
        let buckets: QuickPickItem[] = await s3.getS3BucketsAsQuickItem();

        dialog.addPrompt("bucket", () => {

            return vscode.window.showQuickPick(buckets, {
                canPickMany: false,
                placeHolder: "Select S3 Revision Bucket",
                ignoreFocusOut: true
            })
        });

        dialog.addPrompt("localDir", async () => {
            return await vscode.window.showWorkspaceFolderPick({ placeHolder: "Enter Local Revision Location:", ignoreFocusOut: true })
        });

        await dialog.run();
        this.config = vscode.workspace.getConfiguration("codedeploy");

        if (!dialog.cancelled) {

            await this.config.update("revisionBucket", dialog.getResponse("bucket"));
            await this.config.update("revisionLocalDirectory", dialog.getResponse("localDir").uri.fsPath);
        }

        return dialog.cancelled;
    }

    /**
     * Deploy CodeDeploy Application
     */
    async deploy(deploymentGroupName: string) {

        let revisionName = await vscode.window.showInputBox({ prompt: "Enter Revision Name:", ignoreFocusOut: true });
        if (!revisionName) return;

        let cancelled: Boolean = await this.configureRevisionLocations();
        if (cancelled) return;

        this.initClient();

        // Archive revision and upload to s3
        let s3Util = new S3Util();
        let buffer = s3Util.archive(await this.config.get("revisionLocalDirectory"));
        let revisionEtag: string = await s3Util.upload(buffer, this.config.get("revisionBucket"), revisionName);

        if (revisionEtag) {

            // Create Deployment
            var params = {
                applicationName: this.config.get("applicationName"), /* required */
                deploymentGroupName: deploymentGroupName,
                revision: {
                    s3Location: {
                        bucket: this.config.get("revisionBucket"),
                        key: revisionName,
                        eTag: revisionEtag,
                        bundleType: "zip"
                    },
                    revisionType: "S3"
                }
            }

            let createResponse = await vscode.window.withProgress({
                cancellable: false,
                title: "Creating CodeDeploy Application",
                location: vscode.ProgressLocation.Notification
            }, async (progress, token) => {

                let response = await this.codedeploy.createDeployment(params).promise();
                console.log(`Deployment Started ${response.deploymentId}`);
                return response;
            });

            if (createResponse) {

                let openResponse = await vscode.window.showInformationMessage(`Open Deployment ${createResponse.deploymentId} in AWS Console to track progress?`, "Yes", "No");

                if (openResponse == "Yes") {
                    let uri = `${this.config.get("region")}.console.aws.amazon.com/codesuite/codedeploy/deployments/${createResponse.deploymentId}`
                    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse("https://" + uri));
                }
            }
        }

    }

    /**
     * Get Deployment Group
     */
    async getDeploymentGroup(deploymentGroupName: string): Promise<CDDeploymentGroup> {

        if (!deploymentGroupName) {
            return;
        }

        this.initClient();

        // Get Deployment Group
        var params = {
            applicationName: this.config.get("applicationName"),
            deploymentGroupName: deploymentGroupName
        };

        var response = await this.codedeploy.getDeploymentGroup(params).promise();

        if (response.deploymentGroupInfo) {
            let deploymentGroup = new CDDeploymentGroup(response.deploymentGroupInfo.deploymentGroupName);
            deploymentGroup.Data = response.deploymentGroupInfo;
            return deploymentGroup;
        }

    }

    /**
     * Retrieve CodeDeploy Deployments
     */
    async getDeployments(deploymentGroupName: string): Promise<CDDeployment[]> {

        //TODO: prompt to add DeploymentGroup    
        if (!deploymentGroupName)
            return;

        this.initClient();

        let deploymentDetails: CDDeployment[] = [];

        // Get Deployments
        // TODO: review removing this to move to showing multiple deployments
        var deploymentsParams = {
            applicationName: this.config.get("applicationName"),
            deploymentGroupName: deploymentGroupName,
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

        await vscode.window.withProgress({
            cancellable: false,
            title: `Fetching CodeDeploy Deployments`,
            location: vscode.ProgressLocation.Window
        }, async (progress, token) => {

            var response = await this.codedeploy.listDeployments(deploymentsParams).promise();

            let deploymentIds: string[] = await response.deployments;
            // TODO: replace limit with configuration
            let limit = deploymentIds.length > 5 ? 5 : deploymentIds.length;

            if (deploymentIds.length > 0) {
                let _deployments = await this.batchGetDeployments(deploymentIds.slice(0, limit));

                for (let index = 0; index < _deployments.length; index++) {
                    const deployment = _deployments[index];

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
                            break;

                        case "Stopped":
                            deployment.iconPath = TreeItemIcons.Deployment.Stopped;
                            break;

                        case "InProgress":
                            deployment.iconPath = TreeItemIcons.Deployment.InProgress;
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

    /**
     * 
     * @param deploymentIds 
     */
    async batchGetDeployments(deploymentIds: string[]): Promise<CDDeployment[]> {

        let deployments: CDDeployment[] = [];
        this.initClient();

        let params = {
            deploymentIds: deploymentIds
        }

        let response = await this.codedeploy.batchGetDeployments(params).promise();

        response.deploymentsInfo.forEach(deployment => {
            let d: CDDeployment = new CDDeployment(deployment.deploymentId);
            d.Data = deployment;
            deployments.push(d);
        });

        return deployments.sort((a, b) => { return b.Data.createTime - a.Data.createTime });
    }

    /**
     * Retrieves CodeDeploy Deployment
     * @param deploymentId 
     */
    async getDeployment(deploymentId: string) {

        this.initClient();

        let params = {
            deploymentId: deploymentId
        };

        let response = await this.codedeploy.getDeployment(params).promise();
        return response;
    }

    /**
     * Displays CodeDeploy DeploymentInformation in a TextDocument for given deploymentId
     * @param deploymentId 
     */
    async viewDeployment(deploymentId: any) {

        let response = await this.getDeployment(deploymentId);

        let uri = vscode.Uri.parse("untitled:" + path.join(`${deploymentId}.json`));
        vscode.workspace.openTextDocument(uri).then(document => {
            const edit = new vscode.WorkspaceEdit();
            edit.insert(uri, new vscode.Position(0, 0), JSON.stringify(response, null, "\t"));
            return vscode.workspace.applyEdit(edit).then(success => {
                if (success) {
                    vscode.window.showTextDocument(document);
                } else {
                    vscode.window.showInformationMessage('Unknown Error');
                }
            });
        });

    }

    async deleteApplication(applicationName: string) {

        let confirmDelete = await vscode.window.showInformationMessage(`Are you sure you want to delete ${applicationName}?`, { modal: true }, "Delete");
        if (confirmDelete == "Delete") {

            this.initClient();

            let params = {
                applicationName: applicationName
            };

            return await vscode.window.withProgress(
                {
                    cancellable: false,
                    location: vscode.ProgressLocation.Notification,
                    title: `Deleting Application ${applicationName}`
                },
                async (progress, token) => {
                    let response = await this.codedeploy.deleteApplication(params).promise();
                    return response;
                }
            )
        }
    }

    async deleteDeploymentGroup(deploymentGroupName: string) {

        let confirmDelete = await vscode.window.showInformationMessage(`Are you sure you want to delete ${deploymentGroupName}?`, { modal: true }, "Delete");
        if (confirmDelete == "Delete") {

            this.initClient();

            let params = {
                applicationName: this.config.get("applicationName"),
                deploymentGroupName: deploymentGroupName
            }

            await vscode.window.withProgress(
                {
                    cancellable: false,
                    location: vscode.ProgressLocation.Notification,
                    title: `Deleting Deployment Group ${deploymentGroupName}`
                },
                async (progress, token) => {
                    let response = await this.codedeploy.deleteDeploymentGroup(params).promise();
                }
            )

        }
    }
    async getDeploymentTargetTreeItems(deploymentId: string): Promise<vscode.TreeItem[]> {

        this.initClient();

        // List Targets
        let listParams = {
            deploymentId: deploymentId
        };

        let listResponse = await this.codedeploy.listDeploymentTargets(listParams).promise();

        if (listResponse.targetIds.length > 0) {

            // Get Target Details
            let batchTargetParams = {
                deploymentId: deploymentId,
                targetIds: listResponse.targetIds
            }

            let batchTargetResponse = await this.codedeploy.batchGetDeploymentTargets(batchTargetParams).promise();

            let targets: vscode.TreeItem[] = [];

            batchTargetResponse.deploymentTargets.forEach(target => {
                // Create Target TreeItems
                if (target.deploymentTargetType == "InstanceTarget") {

                    let treeitem = TreeItemUtil.addCollapsedItem(target.instanceTarget.targetId, "instanceTarget");
                    treeitem.collapsibleState = vscode.TreeItemCollapsibleState.None;
                    treeitem.tooltip = `${target.instanceTarget.status} - ${target.instanceTarget.lastUpdatedAt}`;

                    switch (target.instanceTarget.status) {
                        case "Failed":

                            treeitem.contextValue = "instanceTarget_failed";
                            treeitem.iconPath = TreeItemIcons.Target.Failed

                            for (let index = 0; index < target.instanceTarget.lifecycleEvents.length; index++) {
                                const _event = target.instanceTarget.lifecycleEvents[index];
                                if (_event.status == "Failed") {
                                    treeitem.tooltip = `${_event.lifecycleEventName} ${_event.status} - ${_event.diagnostics.errorCode}: ${_event.diagnostics.message}`;
                                    break;
                                }
                                else if (_event.status == "Skipped") {
                                    treeitem.tooltip = `${_event.status} lifecycle events - ${_event.endTime}`;
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

    async getDeploymentGroupTreeItem(deploymentGroupName: string): Promise<vscode.TreeItem[]> {

        let dg = await this.getDeploymentGroup(deploymentGroupName);

        let properties = [];
        if (dg) {

            let tagFiltersItem = TreeItemUtil.addCollapsedItem("EC2 Tag Filters", "ec2TagFilters");
            tagFiltersItem.id = `filter_groupid_${deploymentGroupName}`;
            properties.push(tagFiltersItem);

            let asgsItem = TreeItemUtil.addCollapsedItem("Auto Scaling Groups", "autoScalingGroups");
            asgsItem.id = `asg_groupid_${deploymentGroupName}`;
            properties.push(asgsItem);

            // TODO: check if we can't get the parent label, i.e. DeploymentGroupName so that we don't use id
            let deploymentsTreeItem: vscode.TreeItem = TreeItemUtil.addCollapsedItem("Deployments", "deployments");
            deploymentsTreeItem.id = `deployments_groupid_${deploymentGroupName}`;

            properties.push(deploymentsTreeItem);
        }

        return properties;
    }


    async getDeploymentGroupsTreeItems(): Promise<vscode.TreeItem[]> {

        this.initClient();

        let params = {
            applicationName: this.config.get("applicationName")
        }

        let response = await this.codedeploy.listDeploymentGroups(params).promise();
        let deploymentGroups: vscode.TreeItem[] = [];

        if (response.deploymentGroups.length > 0) {
            response.deploymentGroups.forEach(deploymentGroup => {
                let treeItem: vscode.TreeItem = new vscode.TreeItem(deploymentGroup, vscode.TreeItemCollapsibleState.Collapsed);
                treeItem.contextValue = "deploymentGroup";

                deploymentGroups.push(treeItem);
            });
            return deploymentGroups;
        }
        else {
            let createDeploymentHint: vscode.TreeItem = new vscode.TreeItem("-> Create Deployment Group", vscode.TreeItemCollapsibleState.None);
            createDeploymentHint.command = {
                command: "cdExplorer.createDeploymentGroup",
                title: "Create Deploment Group"
            };
            return [createDeploymentHint];
        }
    }

    /**
     * Add EC2 Tag Filter
     */
    async addEC2Tag(deploymentGroupName: string) {

        let dialog: Dialog = new Dialog();

        dialog.addPrompt("tagName", async () => { return await vscode.window.showInputBox({ prompt: "Enter EC2 Tag Filter Name:", ignoreFocusOut: true }) });
        dialog.addPrompt("tagValue", async () => { return await vscode.window.showInputBox({ prompt: "Enter EC2 Tag Filter Value:", ignoreFocusOut: true }) });

        await dialog.run();

        if (!dialog.cancelled) {

            this.initClient();

            let dg: CDDeploymentGroup = await this.getDeploymentGroup(deploymentGroupName);
            let existingFilters = dg.Data.ec2TagFilters ? dg.Data.ec2TagFilters : [];

            let tag = {
                Key: dialog.getResponse("tagName"),
                Value: dialog.getResponse("tagValue"),
                Type: "KEY_AND_VALUE"
            }

            existingFilters.push(tag);

            let params = {
                ec2TagFilters: existingFilters,
                applicationName: this.config.get("applicationName"),
                currentDeploymentGroupName: deploymentGroupName
            }

            return await vscode.window.withProgress(
                {
                    cancellable: false,
                    location: vscode.ProgressLocation.Notification,
                    title: `Adding EC2 Tag Filter ${tag.Key} to ${deploymentGroupName}`
                }, async (progress, token) => {

                    let response = await this.codedeploy.updateDeploymentGroup(params).promise();
                    console.log(`EC2 Tag Filter ${tag.Key} added to ${deploymentGroupName}`);
                    return response;
                });
        }
    }

    async listEC2TagFilters(deploymentGroupName: string) {

        let dg = await this.getDeploymentGroup(deploymentGroupName);

        let tagFilters: vscode.TreeItem[] = [];

        // TODO: Check if ec2TagSet/ec2TagFilters is undefined
        if (dg.Data.ec2TagFilters) {
            dg.Data.ec2TagFilters.forEach(ec2Tag => {
                let treeItem = new vscode.TreeItem(`${ec2Tag.Key}=${ec2Tag.Value}`, vscode.TreeItemCollapsibleState.None);

                treeItem.iconPath = TreeItemIcons.EC2Tag;

                treeItem.contextValue = `ec2TagFilter_${deploymentGroupName}`;
                treeItem.id = `${deploymentGroupName}_${ec2Tag.Key}`;

                tagFilters.push(treeItem);
            });
        }
        else if (dg.Data.ec2TagSet) {

            dg.Data.ec2TagSet.ec2TagSetList.forEach(ec2TagList => {

                ec2TagList.forEach(ec2Tag => {

                    let treeItem = new vscode.TreeItem(`${ec2Tag.Key}=${ec2Tag.Value}`, vscode.TreeItemCollapsibleState.None);

                    treeItem.iconPath = TreeItemIcons.EC2Tag;

                    treeItem.contextValue = `ec2TagFilter_${deploymentGroupName}`;
                    treeItem.id = `${deploymentGroupName}_${ec2Tag.Key}`;

                    tagFilters.push(treeItem);
                });
            });
        }

        return tagFilters;
    }

    async deleteEC2TagFilter(ec2TagKey: string, deploymentGroupName: string) {

        this.initClient();

        let dg = await this.getDeploymentGroup(deploymentGroupName);
        let updateResponse;
        let params;

        if (dg.Data.ec2TagFilters) {
            // Update ec2TagFilters
            let ec2TagFilters = dg.Data.ec2TagFilters.filter((dg) => { return dg.Key != ec2TagKey });

            params = {
                ec2TagFilters: ec2TagFilters,
                currentDeploymentGroupName: deploymentGroupName,
                applicationName: this.config.get("applicationName")
            }
        }
        else if (dg.Data.ec2TagSet) {

            // Update ec2TagSet
            let ec2TagSet = { ec2TagSetList: [] };
            dg.Data.ec2TagSet.ec2TagSetList.forEach(ec2TagList => {
                let _ec2TagList = ec2TagList.filter((dg) => { return dg.Key != ec2TagKey });
                if (_ec2TagList.length > 0) {
                    ec2TagSet.ec2TagSetList.push(_ec2TagList);
                }
            });

            params = {
                ec2TagSet: ec2TagSet,
                currentDeploymentGroupName: deploymentGroupName,
                applicationName: this.config.get("applicationName")
            }
        }

        await vscode.window.withProgress(
            {
                cancellable: false,
                title: `Deleting ${deploymentGroupName} EC2 Tag Filter ${ec2TagKey}`,
                location: vscode.ProgressLocation.Notification
            }, async (progress, token) => {

                return updateResponse = await this.codedeploy.updateDeploymentGroup(params).promise();
            }

        )

        // TODO: Check UpdateResponse for success
        if (updateResponse) {
            console.log(`Deleted ${deploymentGroupName} EC2 Tag Filter ${ec2TagKey}`);
        }
    }

    async removeASG(autoscalingGroupName: string, deploymentGroupName: string) {

        this.initClient();

        let dg = await this.getDeploymentGroup(deploymentGroupName);
        let updateResponse;

        if (dg.Data.autoScalingGroups) {

            let autoScalingGroups = dg.Data.autoScalingGroups.filter((asg) => { return asg.name != autoscalingGroupName });
            let _autoScalingGroups = [];
            autoScalingGroups.forEach(asg => {
                _autoScalingGroups.push(asg.name);
            });

            let params = {
                autoScalingGroups: _autoScalingGroups,
                currentDeploymentGroupName: deploymentGroupName,
                applicationName: this.config.get("applicationName")
            }

            return vscode.window.withProgress(
                {
                    cancellable: false,
                    title: `Removing  Deployment Group: \'${deploymentGroupName}\' ASG ${autoscalingGroupName}`,
                    location: vscode.ProgressLocation.Notification
                }, async (progress, token) => {
                    return updateResponse = await this.codedeploy.updateDeploymentGroup(params).promise();
                }
            )
        }

        // TODO: Check UpdateResponse for success
        if (updateResponse) {
            console.log(`Successfully removed ${deploymentGroupName} AutoScaling Group ${autoscalingGroupName}`);
        }
    }

    /**
     * Add ASG to Deployment Group
     */
    async addASG(deploymentGroupName: string) {

        let asgUtil = new AutoScalingUtil();
        let asgQuickPickItems = await asgUtil.getAsgsAsQuickPickItems();
        let asgs = await vscode.window.showQuickPick(asgQuickPickItems, {
            placeHolder: asgQuickPickItems.length > 0 ? "Select AutoScaling Groups:" : `No AutoScaling Groups found in ${this.config.get("region")}`,
            canPickMany: true,
            ignoreFocusOut: true
        })

        if (asgs.length > 0) {

            let autoScalingGroups = [];
            asgs.forEach(item => {
                autoScalingGroups.push(item.label);
            });

            this.initClient();

            let dg: CDDeploymentGroup = await this.getDeploymentGroup(deploymentGroupName);

            let params = {
                autoScalingGroups: autoScalingGroups,
                applicationName: this.config.get("applicationName"),
                currentDeploymentGroupName: deploymentGroupName
            }

            return vscode.window.withProgress({
                cancellable: false,
                location: vscode.ProgressLocation.Notification,
                title: `Adding ASG(s) to Deployment Group ${deploymentGroupName}`
            },
                async (progress, token) => {
                    let updateresponse = await this.codedeploy.updateDeploymentGroup(params).promise();
                    console.log(`ASG(s) added to Deployment Group ${deploymentGroupName}`);
                    return updateresponse;
                }
            )
        }
    }

    async getApplicationsAsQuickPickItems() {

        this.initClient();

        let listResponse = await this.codedeploy.listApplications({}).promise();
        let quickPickItems: QuickPickItem[] = [];

        if (listResponse.applications) {

            if (listResponse.applications.length > 0) {
                let batchResponse = await this.codedeploy.batchGetApplications({ applicationNames: listResponse.applications }).promise();

                batchResponse.applicationsInfo.forEach(appInfo => {
                    // Limited to CodeDeploy EC2
                    if (appInfo.computePlatform == "Server") {
                        let item: QuickPickItem = new QuickPickItem(appInfo.applicationName, "");
                        quickPickItems.push(item);
                    }
                });
            }
        }

        return quickPickItems;
    }

    async getAutoScalingGroups(deploymentGroupName: string): Promise<vscode.TreeItem[]> {

        let dg = await this.getDeploymentGroup(deploymentGroupName);
        let asgs = [];

        dg.Data.autoScalingGroups.forEach(asg => {
            let treeItem = new vscode.TreeItem(asg.name, vscode.TreeItemCollapsibleState.None)
            treeItem.contextValue = `autoscaling_${deploymentGroupName}`;
            asgs.push(treeItem)
        });

        return asgs;
    }

    async stopDeployment(deploymentId: string) {

        this.initClient();

        let params = {
            deploymentId: deploymentId
        };

        await vscode.window.withProgress({
            cancellable: false,
            location: vscode.ProgressLocation.Window,
            title: `Stopping dpeloyment ${deploymentId}`
        }, async (progress, token) => {

            let response = await this.codedeploy.stopDeployment(params).promise();
            if (response.Status == "Succeeded") {
                console.log(`Stopped Deployment ${deploymentId}`);
            }

            return response;
        })
    }

    /**
    * Retrieve TreeItems for Application contextValues
    */
    getApplicationTreeItems() {

        let treeItems: vscode.TreeItem[] = [];

        let labels = [
            {
                "label": "Deployment Groups",
                "contextValue": "deploymentGroups"
            }
        ];

        labels.forEach(element => {
            let treeItem = TreeItemUtil.addCollapsedItem(element.label, element.contextValue);
            treeItems.push(treeItem);
        });

        return treeItems;
    }
}