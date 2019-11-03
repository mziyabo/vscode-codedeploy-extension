let AWS = require("aws-sdk");
import * as vscode from 'vscode';
import * as path from 'path';
import { CDApplication, CDDeploymentGroup, CDDeployment } from "../models/cdmodels";
import { S3Util } from "../s3/s3Util";
import { AWSRegions } from '../models/region';
import { ConfigurationUtil } from '../shared/config/config';
import { Dialog } from '../shared/ui/dialog';

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
        dialog.run();

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
     * Deploy Workspace Code to AWS CodeDeploy
     */
    async deploy() {

        this.initClient();

        // TODO: validate workspace contains appspec.yml/ready
        if (await vscode.workspace.findFiles('./appspec.yml')) {

            // TODO: refactor, better manage revision location details
            let revisionBucket: string = this.conf.get("s3LocationBucket");
            revisionBucket = await vscode.window.showInputBox({ prompt: "Enter CodeDeploy BucketName:", value: revisionBucket, ignoreFocusOut: true });
            let revisionLocalDir = await vscode.window.showWorkspaceFolderPick({ placeHolder: "Enter Code Directory", ignoreFocusOut: true });
            let revisionName = await vscode.window.showInputBox({ prompt: "Enter Revision Name:", ignoreFocusOut: true });

            // archive revision and upload to s3
            let s3Util = new S3Util();
            let buffer = s3Util.archive(await revisionLocalDir.uri.fsPath);

            let revisionEtag: string = await s3Util.upload(buffer, revisionBucket, revisionName);

            if (revisionEtag) {

                // Create Deployment
                var params = {
                    applicationName: this.conf.get("applicationName"), /* required */
                    deploymentGroupName: this.conf.get("deploymentGroupName"),
                    revision: {
                        s3Location: {
                            bucket: revisionBucket,
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
                    location: vscode.ProgressLocation.Notification
                }
                    , async (progress, token) => {

                        let response = await this.codedeploy.createDeployment(params).promise();
                        console.log(`Deployment Started ${response}`)
                    });
            }
        }
        else {

            // TODO: throw appspec required exception
            vscode.window.showErrorMessage("CodeDeploy missing required appspec.yml file")
        }

    }

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
            deploymentGroups = [this.DeploymentGroup];
        }

        return deploymentGroups;
    }

    /**
     * Retrieve CodeDeploy Deployments
     */
    async getDeployments(): Promise<CDDeployment[]> {

        this.initClient();

        var deployments: CDDeployment[] = [];
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
            location: vscode.ProgressLocation.Notification
        }, async (progress, token) => {

            var response = await this.codedeploy.listDeployments(deploymentsparams).promise();

            // TODO: foreach deployment from listDeployments, create deployment object
            await response.deployments.forEach(element => {
                let deployment = new CDDeployment(`${element}`);
                deployments.push(deployment);
            });

            let limit = deployments.length > 10 ? 10 : deployments.length;

            for (let i = 0; i < limit; i++) {
                let deployment = deployments[i];
                let response = await this.getDeployment(deployments[i].label);
                let deploymentInfo = response.deploymentInfo;

                deployment.tooltip = `${deploymentInfo.status} - ${deploymentInfo.completeTime}`;
                if (deploymentInfo.status == "Failed") {
                    // TODO: fix icons issue, i.e. use themeicon instead
                    deployment.description = `- ${deploymentInfo.errorInformation.message}`;
                    deployment.iconPath = vscode.Uri.file(path.join(__dirname, "../resources/light/error.svg"));
                }
                else {
                    deployment.iconPath = vscode.Uri.file(path.join(__dirname, "../resources/light/check.svg"));
                }

                deploymentDetails.push(deployment);
            }
        })

        return deploymentDetails;
    }

    /**
     * Retrieves CodeDeploy Deployment
     * @param deploymentId 
     */
    async getDeployment(deploymentId: string) {

        this.initClient();

        var params = {
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

    configureRevisionLocations() {
        // TODO:
        throw new Error("Method not implemented.");
    }

    delete(node: vscode.TreeItem) {
        // TODO:
        throw new Error("Method not implemented.");
    }

}