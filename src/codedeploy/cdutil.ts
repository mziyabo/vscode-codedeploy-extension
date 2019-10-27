let AWS = require("aws-sdk");
import * as vscode from 'vscode';
import { CDApplication, CDDeploymentGroup, CDDeployment } from "../models/cdmodels";
import { S3Util } from "../s3/s3Util";
import * as path from 'path';
import { AWSRegions } from '../models/region';
import { ConfigurationUtil } from '../shared/config/config';

export class CDUtil {

    public Application: CDApplication;
    public DeploymentGroup: CDDeploymentGroup;
    public Deployments: CDDeployment[];

    private _applicationName;
    private _deploymentGroupName;
    private _region;

    private codedeploy;
    private conf = vscode.workspace.getConfiguration("codedeploy");

    config:ConfigurationUtil = new ConfigurationUtil();

    constructor() {
    }

    /**
     * Initialize/Update/Get/Refresh Global variables
     */
    initClient() {
        this.conf = vscode.workspace.getConfiguration("codedeploy");

        this.codedeploy = new AWS.CodeDeploy({
            apiVersion: '2014-10-06',
            region: this.conf.get("region")
        });
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

    /**
     * Select/Use existing CodeDeploy application for WorkSpace
     */
    async updateExtensionConfig() {

        this.initClient();

        if (!this.conf.get("applicationName")) {

            //Get applicationName, deploymentGroupName and region
            let region = await vscode.window.showQuickPick(AWSRegions.toQuickPickItemArray(), {
                canPickMany: false,
                placeHolder: "Select AWS CodeDeploy Region",
                ignoreFocusOut: true
            });

            this._region = region.label? region.label: "";
            this._applicationName = await vscode.window.showInputBox({ prompt: "Enter Application Name" });
            this._deploymentGroupName = await vscode.window.showInputBox({ prompt: "Enter DeploymentGroup Name" });

            // Update Configuration
            
            await this.conf.update("region", this._region);
            await this.conf.update("applicationName", this._applicationName);
            await this.conf.update("deploymentGroupName", this._deploymentGroupName);
        }
        this.conf = vscode.workspace.getConfiguration("codedeploy");
        return this.conf;
    }

    /**
     * Create a CodeDeploy Application and Deployment Group for Workspace
     */
    async scaffoldApplication() {

        this.conf = vscode.workspace.getConfiguration("codedeploy");

        // TODO: abort ALL if request/s fails
        let createAppResponse = await this.createApplication();

        let createDeploymentGp = await vscode.window.showQuickPick(["Yes", "No"], {
            placeHolder: "Create Deployment Group?",
            ignoreFocusOut: true
        });
        if (createDeploymentGp == "Yes") {
            await this.createDeploymentGroup();
        }

        // TODO: prompt to create deployment targets
    }

    async createApplication() {

        this.initClient();

        // CreateApplication
        var applicationParams = {
            applicationName: this._applicationName,
            computePlatform: 'Server'
        };

        // TODO: verify response result
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
        let document = await vscode.workspace.openTextDocument({ content: JSON.stringify(response, null, "\t"), language: "json" });

        await vscode.window.showTextDocument(document);
    }

}