let AWS = require("aws-sdk");
import * as vscode from 'vscode';
import { CDApplication, CDDeploymentGroup, CDDeployment, AWSRegions } from "../model/model";
import { S3Util } from "../s3/s3Util";

export class CDUtil {

    public Application: CDApplication;
    public DeploymentGroup: CDDeploymentGroup;
    public Deployments: CDDeployment[];

    private _applicationName;
    private _deploymentGroupName;
    private _region;

    private codedeploy;

    private conf = vscode.workspace.getConfiguration("codedeploy");

    constructor() {

        this.codedeploy = new AWS.CodeDeploy({
            apiVersion: '2014-10-06',
            region: this.conf.get("region")
        });
    }

    /**
     * Returns CodeDeploy Application for Workspace
     * @return Promise<CDApplication[]>
     */
    async getApplication(): Promise<CDApplication[]> {
        this.conf = vscode.workspace.getConfiguration("codedeploy");
        this.codedeploy = new AWS.CodeDeploy({
            apiVersion: '2014-10-06',
            region: this.conf.get("region")
        });

        // Get CodeDeploy Application
        var applicationparams = {
            applicationName: this.conf.get("applicationName")
        };

        let response = await this.codedeploy.getApplication(applicationparams).promise();

        if (response.application) {

            let application = new CDApplication(response.application.applicationName, vscode.TreeItemCollapsibleState.Collapsed);
            application.Data = response;
            this.Application = application;
            return [application];
        }

        return [];
    }

    /**
     * Select/Use existing CodeDeploy application for WorkSpace
     */
    async updateExtensionConfig() {

        let conf = vscode.workspace.getConfiguration("codedeploy");
        if (!conf.get("applicationName")) {

            // Get applicationName, deploymentGroupName and region
            // _region = await vscode.window.showQuickPick(AWSRegions,{
            //         canPickMany: false,
            //         placeHolder: "Select AWS CodeDeploy Region",
            //         ignoreFocusOut: true
            //     });

            this._region = await vscode.window.showInputBox({ prompt: "Enter AWS CodeDeploy Region e.g. us-east-1" });
            this._applicationName = await vscode.window.showInputBox({ prompt: "Enter Application Name" });
            this._deploymentGroupName = await vscode.window.showInputBox({ prompt: "Enter DeploymentGroup Name" });

            // Update Configuration
            await conf.update("region", this._region);
            await conf.update("applicationName", this._applicationName);
            await conf.update("deploymentGroupName", this._deploymentGroupName);
        }
        conf = vscode.workspace.getConfiguration("codedeploy");
        return conf;
    }

    /**
     * Create a CodeDeploy Application and Deployment Group for Workspace
     */
    async scaffoldApplication() {

        this.conf = vscode.workspace.getConfiguration("codedeploy");
        await this.createApplication();

        let createDeploymentGp = await vscode.window.showQuickPick(["Yes", "No"], {
            placeHolder: "Create Deployment Group?",
            ignoreFocusOut: true
        });
        if (createDeploymentGp == "Yes") {
            await this.createDeploymentGroup();
        }
    }

    async createApplication() {

        this.codedeploy = new AWS.CodeDeploy({
            apiVersion: '2014-10-06',
            region: this.conf.get("region")
        });

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

        // TODO: return fail/success
    }

    async createDeploymentGroup() {

        this.codedeploy = new AWS.CodeDeploy({
            apiVersion: '2014-10-06',
            region: this.conf.get("region")
        });

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
        // TODO: spin up EC2 Instances
    }

    /**
     * Deploy Workspace Code to AWS CodeDeploy
     */
    async deploy() {

        this.conf = vscode.workspace.getConfiguration("codedeploy");

        this.codedeploy = new AWS.CodeDeploy({
            apiVersion: '2014-10-06',
            region: this.conf.get("region")
        });

        // Validate workspace contains appspec.yml
        if (await vscode.workspace.findFiles('./appspec.yml')) {

            // TODO: refactor, better manage revision location details
            let revisionBucket: string = this.conf.get("s3LocationBucket");
            revisionBucket = await vscode.window.showInputBox({ prompt: "Enter CodeDeploy BucketName:", value: revisionBucket, ignoreFocusOut: true });
            let revisionLocalDir = await vscode.window.showWorkspaceFolderPick({ placeHolder: "Enter Code Directory", ignoreFocusOut: true });
            let revisionName = await vscode.window.showInputBox({ prompt: "Enter Revision Name:", ignoreFocusOut: true });

            // Archive revision and upload to s3
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

        this.codedeploy = new AWS.CodeDeploy({
            apiVersion: '2014-10-06',
            region: this.conf.get("region")
        });

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

    async getDeployments(): Promise<CDDeployment[]> {

        var deployments = [];
        this.conf = vscode.workspace.getConfiguration("codedeploy");

        let codedeploy = new AWS.CodeDeploy({
            apiVersion: '2014-10-06',
            region: this.conf.get("region")
        });

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

        var response = await codedeploy.listDeployments(deploymentsparams).promise();


        // TODO: Foreach deployment from listDeployments, create deployment object
        response.deployments.forEach(element => {
            deployments.push(new CDDeployment(element, vscode.TreeItemCollapsibleState.None));
        });


        this.Deployments = deployments;
        return deployments;
    }

}