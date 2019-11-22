let AWS = require("aws-sdk");
import * as vscode from 'vscode';
import * as path from 'path';
import { CDApplication, CDDeploymentGroup, CDDeployment } from "../../models/cdmodels";
import { S3Util } from "../s3/s3";
import { AWSRegions } from '../../models/region';
import { ConfigurationUtil } from '../../shared/configuration/config';
import { Dialog } from '../../shared/ui/dialog';
import { QuickPickItem } from '../../shared/ui/quickpickitem';
import { TreeItemUtil } from '../../shared/ui/treeItemUtil';
import { IAMUtil } from '../iam/iam';
import { autoscalingUtil } from '../autoscaling/autoscaling';

export class CDUtil {

    public Application: CDApplication;
    public Deployments: CDDeployment[];
    public DeploymentGroup: CDDeploymentGroup;

    private codedeploy;
    private _applicationName;
    private _deploymentGroupName;
    private _region;

    config: ConfigurationUtil;
    private conf = vscode.workspace.getConfiguration("codedeploy");

    constructor() {
        this.config = new ConfigurationUtil();
    }

    /**
     * Initialize/Update/Get/Refresh Global variables
     */
    async initClient() {

        this.conf = vscode.workspace.getConfiguration("codedeploy");

        if (this.conf.get("region")) {

            this.codedeploy = new AWS.CodeDeploy({
                apiVersion: '2014-10-06',
                region: this.conf.get("region")
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
            applicationName: this.conf.get("applicationName")
        };

        let response = await this.codedeploy.getApplication(applicationparams).promise();

        if (response.application) {

            let application = new CDApplication(response.application.applicationName, vscode.TreeItemCollapsibleState.Collapsed);
            application.Data = response;
            this.Application = application;
            return application;
        }

        return;
    }


    async getExistingCodeDeploy() {

        // TODO: check if an application is associated with the workspace already
        let dialog: Dialog = new Dialog();

        let _region = await vscode.window.showQuickPick(AWSRegions.toQuickPickItemArray(), {
                canPickMany: false,
                placeHolder: "Select AWS CodeDeploy Region",
                ignoreFocusOut: true});
        
        if(!_region) return;
        await this.conf.update("region", _region.label);

        dialog.addPrompt("_applicationName", async () => {
            return await vscode.window.showQuickPick(this.getApplicationsAsQuickPickItems(), {
                canPickMany: false,
                placeHolder: "Select AWS CodeDeploy Application",
                ignoreFocusOut: true
            });
        })

        await dialog.run();

        if (!dialog.cancelled) {
            this._applicationName = dialog.getResponse("_applicationName");
            await this.conf.update("applicationName", this._applicationName);
        }
    }

    /**
     * Create a CodeDeploy Application and Deployment Group for Workspace
     */
    async scaffoldApplication() {

        let createAppResponse = await this.createApplication();

        if (createAppResponse) {

            let createDeploymentGp = await vscode.window.showInformationMessage("Create Deployment Group?", "Yes", "No");

            if (createDeploymentGp == "Yes") {
                await this.createDeploymentGroup();
                // TODO: prompt to add deployment targets ec2TargetFilter/AutoScalingGroup
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

        if(!_region) return;
        await this.conf.update("region", _region.label);

        dialog.addPrompt("_applicationName", async () => { return await vscode.window.showInputBox({ prompt: "Enter Application Name" }) })
        await dialog.run();

        if (!dialog.cancelled) {

            this._region = _region.label;
            this._applicationName = dialog.getResponse("_applicationName");

            // Update Configuration
            await this.conf.update("applicationName", this._applicationName);

            this.initClient();

            // CreateApplication
            var applicationParams = {
                applicationName: this._applicationName,
                computePlatform: 'Server'
            };

            return vscode.window.withProgress(
                {
                    cancellable: false,
                    title: `Creating CodeDeploy Application: \'${this._applicationName}\'`,
                    location: vscode.ProgressLocation.Window
                }, async (progress, token) => {

                    let response = await this.codedeploy.createApplication(applicationParams).promise();
                    return response;
                }
            );
        }
        else {
            return undefined;
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
                prompt: "Enter Deployment Group Name:",
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
                applicationName: this.conf.get("applicationName"),
                deploymentGroupName: dialog.getResponse("_deploymentGroupName"),
                serviceRoleArn: dialog.getResponse("_serviceRoleArn")
            }

            return vscode.window.withProgress({
                cancellable: false,
                title: `Creating Deployment Group: \'${dialog.getResponse("_deploymentGroupName")}\'`,
                location: vscode.ProgressLocation.Window
            }, async (progress, token) => {
                let response = await this.codedeploy.createDeploymentGroup(params).promise();
                return response;
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
        this.conf = vscode.workspace.getConfiguration("codedeploy");

        if (!dialog.cancelled) {

            await this.conf.update("revisionBucket", dialog.getResponse("bucket"));
            await this.conf.update("revisionLocalDirectory", dialog.getResponse("localDir").uri.fsPath);
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
        let buffer = s3Util.archive(await this.conf.get("revisionLocalDirectory"));
        let revisionEtag: string = await s3Util.upload(buffer, this.conf.get("revisionBucket"), revisionName);

        if (revisionEtag) {

            // Create Deployment
            var params = {
                applicationName: this.conf.get("applicationName"), /* required */
                deploymentGroupName: deploymentGroupName,
                revision: {
                    s3Location: {
                        bucket: this.conf.get("revisionBucket"),
                        key: revisionName,
                        eTag: revisionEtag,
                        bundleType: "zip"
                    },
                    revisionType: "S3"
                }
            }

            await vscode.window.withProgress({
                cancellable: false,
                title: "Creating CodeDeploy Application",
                location: vscode.ProgressLocation.Window
            }, async (progress, token) => {

                let response = await this.codedeploy.createDeployment(params).promise();
                console.log(`Deployment Started ${response.deploymentId}`);

                let openResponse = await vscode.window.showInformationMessage(`Open Deployment ${response.deploymentId} in AWS Console to track progress?`, "Yes", "No");

                if (openResponse == "Yes") {
                    let uri = `${this.conf.get("region")}.console.aws.amazon.com/codesuite/codedeploy/deployments/${response.deploymentId}`
                    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse("https://" + uri));
                }
            });
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

        var deploymentGroups = [];

        // Get Deployment Group
        var deploygroupparams = {
            applicationName: this.conf.get("applicationName"),
            deploymentGroupName: deploymentGroupName
        };

        var response = await this.codedeploy.getDeploymentGroup(deploygroupparams).promise();

        if (response.deploymentGroupInfo) {
            this.DeploymentGroup = new CDDeploymentGroup(response.deploymentGroupInfo.deploymentGroupName);
            this.DeploymentGroup.Data = response.deploymentGroupInfo;
            deploymentGroups = [this.DeploymentGroup];
        }

        return this.DeploymentGroup;
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
            applicationName: this.conf.get("applicationName"),
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

                    deployment.tooltip = `${deployment.Data.status} - ${deployment.Data.completeTime}`;

                    if (deployment.Data.status == "Failed") {

                        deployment.tooltip += `- ${deployment.Data.errorInformation.message}`;
                        deployment.description = `- ${deployment.Data.errorInformation.message}`;

                        deployment.iconPath = {
                            light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/error.svg")),
                            dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/error.svg"))

                        };
                    }
                    else if (deployment.Data.status == "Succeeded") {
                        deployment.iconPath = {
                            light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/check.svg")),
                            dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/check.svg"))
                        };
                    }
                    else if (deployment.Data.status == "InProgress") {
                        deployment.iconPath = {
                            light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/progress.svg")),
                            dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/progress.svg"))
                        };
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

        for (let index = 0; index < response.deploymentsInfo.length; index++) {
            const deployment = response.deploymentsInfo[index];
            let d: CDDeployment = new CDDeployment(deployment.deploymentId);
            d.Data = deployment;

            deployments.push(d);
        }

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
                    vscode.window.showInformationMessage('Error!');
                }
            });
        });

    }

    async delete(node: vscode.TreeItem) {

        this.initClient();

        let params = {
            applicationName: node.label
        };

        let response = await this.codedeploy.deleteApplication(params).promise();
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
                            treeitem.iconPath = {
                                light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/errorTarget.svg")),
                                dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/errorTarget.svg"))
                            };

                            for (let index = 0; index < target.instanceTarget.lifecycleEvents.length; index++) {
                                const _event = target.instanceTarget.lifecycleEvents[index];

                                if (_event.status == "Failed") {
                                    treeitem.tooltip = `${_event.lifecycleEventName} ${_event.status} - ${_event.diagnostics.errorCode}: ${_event.diagnostics.message}`;
                                    break;
                                }
                            }
                            break;

                        case "Succeeded":
                            treeitem.iconPath = {
                                light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/succeededTarget.svg")),
                                dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/succeededTarget.svg"))
                            };
                            break;

                        case "InProgress":
                            treeitem.iconPath = {
                                light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/pendingTarget.svg")),
                                dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/pendingTarget.svg"))
                            };
                            break;

                        default:
                            break;
                    }

                    targets.push(treeitem);
                }
            });

            return targets;
        }
    }

    async getDeploymentGroupInfoTreeItem(deploymentGroupName: string): Promise<vscode.TreeItem[]> {

        let dg = await this.getDeploymentGroup(deploymentGroupName);

        let properties = [];
        if (dg) {

            //properties.push(TreeItemUtil.addProperty("SERVICE_ROLE_ARN", dg.Data.serviceRoleArn, "", true));
            //properties.push(TreeItemUtil.addProperty("DEPLOYMENT_CONFIGURATION", dg.Data.deploymentConfigName, "", true));

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
            applicationName: this.conf.get("applicationName")
        }

        let response = await this.codedeploy.listDeploymentGroups(params).promise();
        let deploymentGroups: vscode.TreeItem[] = [];

        response.deploymentGroups.forEach(deploymentGroup => {
            let treeItem: vscode.TreeItem = new vscode.TreeItem(deploymentGroup, vscode.TreeItemCollapsibleState.Collapsed);
            treeItem.contextValue = "deploymentGroup";

            deploymentGroups.push(treeItem);
        });

        return deploymentGroups;
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
                applicationName: this.conf.get("applicationName"),
                currentDeploymentGroupName: deploymentGroupName
            }

            await this.codedeploy.updateDeploymentGroup(params).promise();
            console.log(`EC2 Tag Filter added`);
        }
    }

    async listEC2TagFilters(deploymentGroupName: string) {

        let dg = await this.getDeploymentGroup(deploymentGroupName);

        let tagFilters: vscode.TreeItem[] = [];
        // TODO: Check if ec2TagSet/ec2TagFilters is undefined
        if (dg.Data.ec2TagFilters) {
            dg.Data.ec2TagFilters.forEach(filter => {
                let treeItem = new vscode.TreeItem(`${filter.Key}=${filter.Value}`, vscode.TreeItemCollapsibleState.None);

                treeItem.iconPath = {
                    light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/tag.svg")),
                    dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/tag.svg")),
                }

                treeItem.contextValue = `ec2TagFilter_${deploymentGroupName}`;
                treeItem.id = `${deploymentGroupName}_${filter.Key}`;

                tagFilters.push(treeItem);
            });
        }
        else if (dg.Data.ec2TagSet) {

            dg.Data.ec2TagSet.ec2TagSetList.forEach(ec2TagList => {

                ec2TagList.forEach(ec2Tag => {

                    let treeItem = new vscode.TreeItem(`${ec2Tag.Key}=${ec2Tag.Value}`, vscode.TreeItemCollapsibleState.None);

                    treeItem.iconPath = {
                        light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/tag.svg")),
                        dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/tag.svg")),
                    }

                    treeItem.contextValue = `ec2TagFilter_${deploymentGroupName}`;
                    treeItem.id = ec2Tag.Key;

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
                applicationName: this.conf.get("applicationName")
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
                applicationName: this.conf.get("applicationName")
            }
        }

        await vscode.window.withProgress(
            {
                cancellable: false,
                title: `Deleting ${deploymentGroupName} EC2 Tag Filter ${ec2TagKey}`,
                location: vscode.ProgressLocation.Window
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
                applicationName: this.conf.get("applicationName")
            }

            return vscode.window.withProgress(
                {
                    cancellable: false,
                    title: `Removing  Deployment Group: \'${deploymentGroupName}\' ASG ${autoscalingGroupName}`,
                    location: vscode.ProgressLocation.Window
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

        let asgUtil = new autoscalingUtil();

        let asgs = await vscode.window.showQuickPick(await asgUtil.getAsgsAsQuickPickItems(), {
            placeHolder: "Select AutoScaling Group(s):",
            canPickMany: true,
            ignoreFocusOut: true
        })

        if (asgs) {

            let autoScalingGroups = [];
            asgs.forEach(item => {
                autoScalingGroups.push(item.label);
            });

            this.initClient();

            let dg: CDDeploymentGroup = await this.getDeploymentGroup(this.conf.get("deploymentGroupName"));

            let params = {
                autoScalingGroups: autoScalingGroups,
                applicationName: this.conf.get("applicationName"),
                currentDeploymentGroupName: deploymentGroupName
            }

            await this.codedeploy.updateDeploymentGroup(params).promise();
            console.log(`ASG(s) added to Deployment Group ${deploymentGroupName}`);
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
}