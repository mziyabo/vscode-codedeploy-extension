import * as vscode from 'vscode';
import { CDApplication } from "./models/cdmodels";
import { CDUtil } from './aws/codedeploy/codedeploy';
import { TreeItemUtil } from './shared/ui/treeItemUtil';
import { unlink } from 'fs';

export class CodeDeployTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

    private conf;

    private _onDidChangeTreeData: vscode.EventEmitter<CDApplication | undefined> = new vscode.EventEmitter<CDApplication | undefined>();
    readonly onDidChangeTreeData: vscode.Event<CDApplication | undefined> = this._onDidChangeTreeData.event;

    public cdUtil: CDUtil;

    constructor() {
        this.cdUtil = new CDUtil();
        this.conf = vscode.workspace.getConfiguration("codedeploy");
    }

    async getTreeItem(element: CDApplication): Promise<vscode.TreeItem> {

        this.conf = vscode.workspace.getConfiguration("codedeploy");

        if (!this.conf.get("applicationName")) {
            return;
        }

        if (!element) {
            let application: CDApplication = await this.cdUtil.getApplication();
            return application;

        } else {
            return element;
        }
    }

    getParent(element?: CDApplication): Promise<CDApplication> {
        this.conf = vscode.workspace.getConfiguration("codedeploy");
        if (!this.conf.get("applicationName")) {
            return;
        }

        return Promise.resolve(element);
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {

        this.conf = vscode.workspace.getConfiguration("codedeploy");

        if (!this.conf.get("applicationName")) {
            await this.conf.update("linkedToCodedeployApplication", false);
            return;
        }

        await this.conf.update("linkedToCodedeployApplication", true);
        if (element) {

            var contextValue = element.contextValue;
            switch (contextValue) {
                case "application":
                    return this.applicationTreeItems();
                    break;

                case "deploymentGroups":
                    return await this.cdUtil.getDeploymentGroupsTreeItems();
                    break;

                case "deploymentGroup":
                    return this.cdUtil.getDeploymentGroupInfoTreeItem(element.label);
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
                    return this.cdUtil.listAutoScalingGroups(element.id.substr(12, element.id.length));
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
    applicationTreeItems() {

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
        await this.cdUtil.getExistingCodeDeploy();
        this.refresh();
    }

    async createApplication() {
        await this.cdUtil.scaffoldApplication();
        this.refresh();
    }

    async deploy(node: vscode.TreeItem) {
        this.cdUtil.deploy(node.label);
        this.refresh();
    }

    openConsole(node: any): any {

        let uri: string;

        if (this.conf.get("linkedToCodedeployApplication") && node != undefined) {
            uri = `${this.conf.get("region")}.console.aws.amazon.com/codesuite/codedeploy`;

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
                    uri = uri + `/applications/${this.conf.get("applicationName")}/deployment-groups/${node.label}`;
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
        // TODO: retrieve DeploymentId from node: autoscalingGroups
        await this.cdUtil.addASG();
        this.refresh();
    }

    async addEC2Tag(node: vscode.TreeItem) {
        // TODO: retrieve DeploymentId from node: ec2TagFilters
        await this.cdUtil.addEC2Tag();
        this.refresh();
    }

    async delete(node: vscode.TreeItem) {

        // TODO: prompt/warn user of deletion
        await this.cdUtil.delete(node);
        this.unlinkWorkspace();
    }

    unlinkWorkspace(): any {

        this.conf = vscode.workspace.getConfiguration("codedeploy");

        let settings = [
            "applicationName",
            "deploymentGroupName",
            "revisionBucket",
            "revisionLocalDirectory",
            "linkedToCodedeployApplication"
        ];

        settings.forEach(setting => {
            this.conf.update(setting, undefined);
        });

        this.refresh();
    }

    viewDeployment(node: any) {
        this.cdUtil.viewDeployment(node.label);
    }
}