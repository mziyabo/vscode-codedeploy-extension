let AWS = require("aws-sdk");
import * as vscode from 'vscode';
import * as path from 'path';
import { CDApplication, CDDeploymentGroup, CDDeployment } from "../../models/cdmodels";
import { S3Util } from "../s3/s3Util";
import { AWSRegions } from '../../models/region';
import { ConfigurationUtil } from '../../shared/configuration/config';
import { Dialog } from '../../shared/ui/dialog';
import { QuickPickItem } from '../../shared/ui/quickpickitem';
import { TreeItemUtil } from '../../shared/ui/treeItemUtil';
import { stringify } from 'querystring';

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

        dialog.addPrompt("_region", async () => {
            return await vscode.window.showQuickPick(AWSRegions.toQuickPickItemArray(), {
                canPickMany: false,
                placeHolder: "Select AWS CodeDeploy Region",
                ignoreFocusOut: true
            });
        });

        dialog.addPrompt("_applicationName", async () => { return await vscode.window.showInputBox({ prompt: "Enter Application Name" }) })
        dialog.addPrompt("_deploymentGroupName", async () => { return await vscode.window.showInputBox({ prompt: "Enter DeploymentGroup Name" }) })

        await dialog.run();

        if (!dialog.cancelled) {
            // Do Work 
            this._region = dialog.getResponse("_region");
            this._applicationName = dialog.getResponse("_applicationName");
            this._deploymentGroupName = dialog.getResponse("_deploymentGroupName");

            // Update Configuration
            await this.conf.update("region", this._region);
            await this.conf.update("applicationName", this._applicationName);
            await this.conf.update("deploymentGroupName", this._deploymentGroupName);

        }
    }

    /**
     * Create a CodeDeploy Application and Deployment Group for Workspace
     */
    async scaffoldApplication() {

        // TODO: abort(clear configuration settings) if CreateApplication fails
        let createAppResponse = await this.createApplication();

        let createDeploymentGp = await vscode.window.showQuickPick(["Yes", "No"], {
            placeHolder: "Create Deployment Group?",
            ignoreFocusOut: true
        });

        if (createDeploymentGp == "Yes") {
            await this.createDeploymentGroup();
            // TODO: prompt to create deployment targets
        }
    }

    async createApplication() {

        let dialog: Dialog = new Dialog();

        dialog.addPrompt("_region", async () => {
            return await vscode.window.showQuickPick(AWSRegions.toQuickPickItemArray(), {
                canPickMany: false,
                placeHolder: "Select AWS CodeDeploy Region",
                ignoreFocusOut: true
            });
        });

        dialog.addPrompt("_applicationName", async () => { return await vscode.window.showInputBox({ prompt: "Enter Application Name" }) })
        await dialog.run();

        if (!dialog.cancelled) {

            this._region = dialog.getResponse("_region");
            this._applicationName = dialog.getResponse("_applicationName");

            // Update Configuration
            await this.conf.update("region", this._region);
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
                    title: "Creating CodeDeploy Application",
                    location: vscode.ProgressLocation.Notification
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

        let serviceRoleARN: string = await vscode.window.showInputBox({
            prompt: "Enter CodeDeploy Service Role ARN:",
            ignoreFocusOut: true
        });

        // CreateDeploymentGroup
        var params = {
            applicationName: this._applicationName,
            deploymentGroupName: `${this._deploymentGroupName}`,
            serviceRoleArn: serviceRoleARN,
            ec2TagFilters: [
                {
                    Key: 'deployment_group',
                    Type: 'KEY_AND_VALUE',
                    Value: `${this._deploymentGroupName}`
                },
            ],
        }

        return vscode.window.withProgress(
            {
                cancellable: false,
                title: "Creating Deployment Group",
                location: vscode.ProgressLocation.Notification
            }, async (progress, token) => {
                let response = await this.codedeploy.createDeploymentGroup(params).promise();
                return response;
            });

    }


    /**
     * Set revision bucket and local directory to use
     */
    async configureRevisionLocations() {

        let dialog: Dialog = new Dialog();
        let bucket: string = this.conf.get("s3LocationBucket");

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

            this.conf.update("revisionBucket", dialog.getResponse("bucket"));
            this.conf.update("revisionLocalDirectory", dialog.getResponse("localDir").uri.fsPath);
        }

        return dialog.cancelled;

    }

    /**
     * Deploy CodeDeploy Application
     */
    async deploy() {

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
                deploymentGroupName: this.conf.get("deploymentGroupName"),
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

            vscode.window.withProgress({
                cancellable: false,
                title: "Creating CodeDeploy Application",
                location: vscode.ProgressLocation.Window
            }
                , async (progress, token) => {

                    let response = await this.codedeploy.createDeployment(params).promise();
                    console.log(`Deployment Started ${response}`)
                });
        }

    }


    /**
     * Get Deployment Group
     */
    async getDeploymentGroup(): Promise<CDDeploymentGroup[]> {

        this.initClient();

        var deploymentGroups = [];

        // Get Deployment Group
        var deploygroupparams = {
            applicationName: this.conf.get("applicationName"),
            deploymentGroupName: this.conf.get("deploymentGroupName")
        };

        var response = await this.codedeploy.getDeploymentGroup(deploygroupparams).promise();

        if (response.deploymentGroupInfo) {
            this.DeploymentGroup = new CDDeploymentGroup(response.deploymentGroupInfo.deploymentGroupName);
            this.DeploymentGroup.Data = response.deploymentGroupInfo;
            deploymentGroups = [this.DeploymentGroup];
        }

        return deploymentGroups;
    }

    /**
     * Retrieve CodeDeploy Deployments
     */
    async getDeployments(): Promise<CDDeployment[]> {

        this.initClient();

        let deploymentDetails: CDDeployment[] = [];

        // Get Deployments
        var deploymentsparams = {
            applicationName: this.conf.get("applicationName"),
            deploymentGroupName: this.conf.get("deploymentGroupName"),
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
            title: "Fetching CodeDeploy Deployments",
            location: vscode.ProgressLocation.Window
        }, async (progress, token) => {

            var response = await this.codedeploy.listDeployments(deploymentsparams).promise();

            let deploymentIds: string[] = [];

            await response.deployments.forEach(deploymentId => {
                deploymentIds.push(deploymentId);
            });

            let limit = deploymentIds.length > 10 ? 10 : deploymentIds.length;

            let _deployments = await this.batchGetDeployments(deploymentIds.slice(0, limit));
            _deployments.forEach(deployment => {

                deployment.tooltip = `${deployment.Data.status} - ${deployment.Data.completeTime}`;

                if (deployment.Data.status == "Failed") {

                    // TODO: fix icons issue
                    deployment.description = `- ${deployment.Data.errorInformation.message}`;
                    deployment.iconPath = vscode.Uri.file(path.join(__dirname, "../../resources/light/error.svg"));
                }
                else {
                    deployment.iconPath = vscode.Uri.file(path.join(__dirname, "../../resources/light/success.svg"));
                }

                deploymentDetails.push(deployment);
            });
        })

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

        return deployments;
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

    delete(node: vscode.TreeItem) {
        // TODO:
        throw new Error("Method not implemented.");
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

                    let treeitem = TreeItemUtil.addCollapsedItem(target.instanceTarget.targetId, "instancetarget");
                    treeitem.tooltip = `${target.instanceTarget.status} - ${target.instanceTarget.lastUpdatedAt}`;

                    switch (target.instanceTarget.status) {
                        case "Failed":
                            treeitem.iconPath = vscode.Uri.file(path.join(__dirname, "../../resources/light/errorTarget.svg"));;
                            break;

                        case "Succeeded":
                            treeitem.iconPath = vscode.Uri.file(path.join(__dirname, "../../resources/light/succeededTarget.svg"));;
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

        let deploymentGroups = await this.getDeploymentGroup();
        let properties = [];
        if (deploymentGroups) {

            let dg = deploymentGroups[0];

            properties.push(TreeItemUtil.addProperty("Deployment Configuration", dg.Data.deploymentConfigName));
            properties.push(TreeItemUtil.addProperty("Service Role ARN", dg.Data.serviceRoleArn));

            properties.push(TreeItemUtil.addCollapsedItem("AutoScaling Groups", "autoScalingGroups"));
            properties.push(TreeItemUtil.addCollapsedItem("EC2 tag filters", "ec2TagFilters"));
        }

        return properties;
    }

    /**
     * Add EC2 Tag Filter
     */
    async addEC2Tag() {

        let dialog: Dialog = new Dialog();

        dialog.addPrompt("tagName", async () => { return await vscode.window.showInputBox({ prompt: "Enter EC2 Tag Filter Name:", ignoreFocusOut: true }) });
        dialog.addPrompt("tagValue", async () => { return await vscode.window.showInputBox({ prompt: "Enter EC2 Tag Filter Value:", ignoreFocusOut: true }) });

        await dialog.run();

        if (!dialog.cancelled) {

            this.initClient();

            let dg: CDDeploymentGroup[] = await this.getDeploymentGroup();
            let existingFilters = dg[0].Data.ec2TagFilters ? dg[0].Data.ec2TagFilters : [];

            let tag = {
                Key: dialog.getResponse("tagName"),
                Value: dialog.getResponse("tagValue"),
                Type: "KEY_AND_VALUE"
            }

            existingFilters.push(tag);

            let params = {
                ec2TagFilters: existingFilters,
                applicationName: this.conf.get("applicationName"),
                currentDeploymentGroupName: this.conf.get("deploymentGroupName")
            }

            await this.codedeploy.updateDeploymentGroup(params).promise();
            console.log(`EC2 Tag Filters added`);
        }
    }

    async listEC2TagFilters() {

        let dg = await this.getDeploymentGroup();

        let tagFilters: vscode.TreeItem[] = [];
        // TODO: Check if ec2TagSet/ec2TagFilters is undefined
        dg[0].Data.ec2TagFilters.forEach(filter => {
            tagFilters.push(TreeItemUtil.addProperty(filter.Key, filter.Value, undefined, false))
        });

        return tagFilters;
    }

    /**
     * Add ASG to Deployment Group
     */
    async addASG() {

        let dialog: Dialog = new Dialog();

        dialog.addPrompt("asgName", async () => {
            //TODO: user QuickPickItem for ASGs
            await vscode.window.showInputBox({ prompt: "Enter AutoScaling Group Name:", ignoreFocusOut: true })
        });

        dialog.run();

        if (!dialog.cancelled) {

            this.initClient();

            let dg: CDDeploymentGroup = await this.getDeploymentGroup()[0];
            let existingASGs: string[] = dg.Data.autoScalingGroups;

            existingASGs.push(dialog.getResponse("asgName"));

            let params = {
                autoScalingGroups: existingASGs,
                applicationName: this.conf.get("applicationName"),
                deploymentGroupName: this.conf.get("deploymentGroupName")
            }

            await this.codedeploy.updateDeploymentGroup(params).promise();
            console.log(`ASG added to Deployment Group`);
        }
    }
}