import * as vscode from 'vscode';
import { CDApplication } from "./models/cdmodels";
import { CDUtil } from './aws/codedeploy/codedeploy';
import { TreeItemUtil } from './shared/ui/treeItemUtil';
import { Dialog } from './shared/ui/dialog';
import { AWSRegions } from './models/region';

export class CodeDeployTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    
    private _onDidChangeTreeData: vscode.EventEmitter<CDApplication | undefined> = new vscode.EventEmitter<CDApplication | undefined>();
    readonly onDidChangeTreeData: vscode.Event<CDApplication | undefined> = this._onDidChangeTreeData.event;

    private config: vscode.WorkspaceConfiguration;
    public cdUtil: CDUtil;

    constructor() {
        this.cdUtil = new CDUtil();
        this.config = vscode.workspace.getConfiguration("codedeploy");
    }

    async getTreeItem(element: vscode.TreeItem): Promise<vscode.TreeItem> {
        return element;
    }

    getParent(element?: vscode.TreeItem): Promise<vscode.TreeItem> {
        return Promise.resolve(element);
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {

        if(!vscode.workspace.workspaceFolders)
            return;

        this.config = vscode.workspace.getConfiguration("codedeploy");

        if (!this.config.get("applicationName")) {
            await this.config.update("isApplicationWorkspace", false);
            return;
        }

        await this.config.update("isApplicationWorkspace", true);

        if (element) {

            var contextValue = element.contextValue;
            switch (contextValue) {
                case "application":
                    return this.getApplicationTreeItems();
                    break;

                case "deploymentGroups":
                    return await this.cdUtil.getDeploymentGroupsTreeItems();
                    break;

                case "deploymentGroup":
                    return this.cdUtil.getDeploymentGroupTreeItem(element.label);
                    break;

                case "deployments":
                    let deploymentGroup: string = element.id.substr(20, element.id.length);
                    return this.cdUtil.getDeployments(deploymentGroup);
                    break;

                case "deployment":
                    return this.cdUtil.getDeploymentTargetTreeItems(element.label);
                    break;

                case "ec2TagFilters":
                    return this.cdUtil.listEC2TagFilters(element.id.substr(15, element.id.length));
                    break;

                case "autoScalingGroups":
                    return this.cdUtil.getAutoScalingGroups(element.id.substr(12, element.id.length));
                    break;

                default:
                    break;
            }
        }
        else {
            return vscode.window.withProgress({
                cancellable: false,
                location: vscode.ProgressLocation.Window,
                title: "Fetching CodeDeploy Application"
            },
                async (progress, token) => {
                    return [await this.cdUtil.getApplication()]
                });
        }
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

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async selectApplication() {
        
        if (vscode.workspace.workspaceFolders){
            await this.cdUtil.addExistingApplication();

            this.refresh();
        }
        else{
            let openWorkspaceResponse = await vscode.window.showInformationMessage("Active workspace required to link with CodeDeploy.\n Would you like to open a workspace", "Open Workspace","Later");
            
            if (openWorkspaceResponse == "Open Workspace") {
                let success = await vscode.commands.executeCommand('vscode.openFolder');
                if(success){
                    this.selectApplication();
                }
            }
        }

    }

    async createApplication() {
   
        if (vscode.workspace.workspaceFolders){
            
            let response = await this.cdUtil.scaffoldApplication();
            if (response) {
                this.addTargetsHint(response);
            }
            
            this.refresh();
        }
        else{
            let openWorkspaceResponse = await vscode.window.showInformationMessage("Active workspace required to link with CodeDeploy.\n Would you like to open a workspace", "Open Workspace","Later");
            
            if (openWorkspaceResponse == "Open Workspace") {
                let success = await vscode.commands.executeCommand('vscode.openFolder');
                if(success){
                    this.createApplication();
                }
            }
        }
    }

    async addTargetsHint(response){
        if (response) {
            this.refresh();
            if (response.deploymentGroupName) {

                let hintResponse = await vscode.window.showInformationMessage(`Add targets for ${response.deploymentGroupName}`, "Add AutoScaling Group", "Add EC2 Tag Filters", "Not Now")

                switch (hintResponse) {
                    case "Add AutoScaling Group":
                        this.cdUtil.addASG(response.deploymentGroupName);
                        this.refresh();
                        break;

                    case "Add EC2 Tag Filters":
                        this.cdUtil.addEC2Tag(response.deploymentGroupName);
                        this.refresh();
                        break;
                }
            }
        }
    }

    async deploy(node: vscode.TreeItem) {
        await this.cdUtil.deploy(node.label);
        this.refresh();
    }

    openConsole(node: any): any {

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

    configureRevisionLocations(): any {
        this.cdUtil.configureRevisionLocations();
    }

    async addASG(node: vscode.TreeItem) {

        let deploymentGroupName = node.id.substr(12, node.id.length);

        let response = await this.cdUtil.addASG(deploymentGroupName);
        if (response) {
            this.refresh();
        }
    }

    async addEC2Tag(node: vscode.TreeItem) {

        let deploymentGroupName = node.id.substr(15, node.label.length);
        let response = await this.cdUtil.addEC2Tag(deploymentGroupName);
        if (response) {
            this.refresh();
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
        this.refresh();
    }

    async deleteEC2TagFilter(node: vscode.TreeItem) {
        let deploymentGroupName = node.contextValue.substr(13, node.contextValue.length);
        let ec2TagKey = node.id.substr(deploymentGroupName.length + 1, node.id.length);
        this.cdUtil.deleteEC2TagFilter(ec2TagKey, deploymentGroupName);
        this.refresh();
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

        this.refresh();
    }

    async removeASG(node: vscode.TreeItem) {

        let autoScalingGroupName;
        let deploymentGroupName;

        if (node) {
            autoScalingGroupName = node.label;
            deploymentGroupName = node.contextValue.substr(12, node.contextValue.length);

            await this.cdUtil.removeASG(autoScalingGroupName, deploymentGroupName);

            this.refresh();
        }
    }

    async createDeploymentGroup() {
        let response = await this.cdUtil.createDeploymentGroup();
        if(response){
            this.addTargetsHint(response);
        }
        this.refresh();
    }

    
    async stopDeployment(node: vscode.TreeItem) {
        await this.cdUtil.stopDeployment(node.label);
        this.refresh();
    }

    viewDeployment(node: any) {
        this.cdUtil.viewDeployment(node.label);
    }
}