import * as vscode from 'vscode';
import { CodeDeployUtil } from "../aws/codedeploy/codedeploy";
import { CodeDeployTreeDataProvider } from "../dataprovider";

export class ExtCommand {

    cdUtil: CodeDeployUtil;
    config: vscode.WorkspaceConfiguration;
    dataProvider: CodeDeployTreeDataProvider;

    constructor(dataProvider: CodeDeployTreeDataProvider) {
        this.cdUtil = new CodeDeployUtil();
        this.config = vscode.workspace.getConfiguration("codedeploy");
        this.dataProvider = dataProvider;
    }

    async selectApplication() {

        if (vscode.workspace.workspaceFolders) {
            await this.cdUtil.addExistingApplication();

            this.dataProvider.refresh();
        }
        else {
            let openWorkspaceResponse = await vscode.window.showInformationMessage("Active workspace required to link with CodeDeploy.\n Would you like to open a workspace", "Open Workspace", "Later");

            if (openWorkspaceResponse == "Open Workspace") {
                let success = await vscode.commands.executeCommand('vscode.openFolder');
                if (success) {
                    this.selectApplication();
                }
            }
        }
    }

    async createApplication() {

        if (vscode.workspace.workspaceFolders) {

            let response = await this.cdUtil.scaffoldApplication();
            if (response) {
                this.addTargetsHint(response);
            }

            this.dataProvider.refresh();
        }
        else {
            let openWorkspaceResponse = await vscode.window.showInformationMessage("Active workspace required to link with CodeDeploy.\n Would you like to open a workspace", "Open Workspace", "Later");

            if (openWorkspaceResponse == "Open Workspace") {
                let success = await vscode.commands.executeCommand('vscode.openFolder');
                if (success) {
                    this.createApplication();
                }
            }
        }
    }

    async addTargetsHint(response) {
        if (response) {
            this.dataProvider.refresh();
            if (response.deploymentGroupName) {

                let hintResponse = await vscode.window.showInformationMessage(`Add targets for ${response.deploymentGroupName}`, "Add AutoScaling Group", "Add EC2 Tag Filters", "Not Now")

                switch (hintResponse) {
                    case "Add AutoScaling Group":
                        this.cdUtil.addASG(response.deploymentGroupName);
                        this.dataProvider.refresh();
                        break;

                    case "Add EC2 Tag Filters":
                        this.cdUtil.addEC2Tag(response.deploymentGroupName);
                        this.dataProvider.refresh();
                        break;
                }
            }
        }
    }

    async deploy(node: vscode.TreeItem) {
        await this.cdUtil.deploy(node.label);
        this.dataProvider.refresh();
    }

    configureRevisionLocations(): any {
        this.cdUtil.configureRevisionLocations();
    }

    async addASG(node: vscode.TreeItem) {

        let deploymentGroupName = node.id.substr(12, node.id.length);

        let response = await this.cdUtil.addASG(deploymentGroupName);
        if (response) {
            this.dataProvider.refresh();
        }
    }

    async addEC2Tag(node: vscode.TreeItem) {

        let deploymentGroupName = node.id.substr(15, node.label.length);
        let response = await this.cdUtil.addEC2Tag(deploymentGroupName);
        if (response) {
            this.dataProvider.refresh();
        }
    }

    async deleteApplication(node: vscode.TreeItem) {
        // TODO: prompt/warn user of deletion
        let response = await this.cdUtil.deleteApplication(node.label);
        if (response) {
            this.unlinkWorkspace();
        }
    }

    async deleteDeploymentGroup(node: vscode.TreeItem) {
        await this.cdUtil.deleteDeploymentGroup(node.label);
        this.dataProvider.refresh();
    }

    async deleteEC2TagFilter(node: vscode.TreeItem) {
        let deploymentGroupName = node.contextValue.substr(13, node.contextValue.length);
        let ec2TagKey = node.id.substr(deploymentGroupName.length + 1, node.id.length);
        this.cdUtil.deleteEC2TagFilter(ec2TagKey, deploymentGroupName);
        this.dataProvider.refresh();
    }

    async unlinkWorkspace() {

        this.config = vscode.workspace.getConfiguration("codedeploy");

        let settings = [
            "applicationName",
            "deploymentGroupName",
            "revisionBucket",
            "revisionLocalDirectory",
            "isApplicationWorkspace"
        ];

        settings.forEach(async setting => {
            await this.config.update(setting, undefined);
        });

        await this.config.update("isApplicationWorkspace", false);

        this.dataProvider.refresh();
    }

    async removeASG(node: vscode.TreeItem) {

        let autoScalingGroupName;
        let deploymentGroupName;

        if (node) {
            autoScalingGroupName = node.label;
            deploymentGroupName = node.contextValue.substr(12, node.contextValue.length);

            await this.cdUtil.removeASG(autoScalingGroupName, deploymentGroupName);

            this.dataProvider.refresh();
        }
    }

    async createDeploymentGroup() {
        let response = await this.cdUtil.createDeploymentGroup();
        if (response) {
            this.addTargetsHint(response);
        }
        this.dataProvider.refresh();
    }

    async stopDeployment(node: vscode.TreeItem) {
        await this.cdUtil.stopDeployment(node.label);
        this.dataProvider.refresh();
    }

    openConsole(node: any) {

        let uri: string;

        if (this.config.get("isApplicationWorkspace") && node != undefined) {
            uri = `${this.config.get("region")}.console.aws.amazon.com/codesuite/codedeploy`;

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
                    uri = uri + `/applications/${this.config.get("applicationName")}/deployment-groups/${node.label}`;
                    break;

                case "deploymentGroups":
                    uri = uri + `/applications/${this.config.get("applicationName")}/deploymentGroups`;
                    break;

                case "autoScalingGroups":
                    uri = `console.aws.amazon.com/ec2/autoscaling/home?region=${this.config.get("region")}#AutoScalingGroups:view=details`;
                    break;

                default:
                    if (node.contextValue.includes("autoscaling_")) {
                        uri = `console.aws.amazon.com/ec2/autoscaling/home?region=${this.config.get("region")}#AutoScalingGroups:id=${node.label};view=details`;
                    }
                    break;
            }
        }
        else {
            uri = `console.aws.amazon.com/codesuite/codedeploy/start?`;
        }

        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse("https://" + uri));
    }

    viewDeployment(node: any) {
        this.cdUtil.viewDeployment(node.label);
    }
}