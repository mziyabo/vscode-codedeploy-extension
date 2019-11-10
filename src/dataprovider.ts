import * as vscode from 'vscode';
import { CDApplication } from "./models/cdmodels";
import { CDUtil } from './aws/codedeploy/cdutil';
import { TreeItemUtil } from './shared/ui/treeItemUtil';

export class CodeDeployTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

    private conf = vscode.workspace.getConfiguration("codedeploy");

    private _onDidChangeTreeData: vscode.EventEmitter<CDApplication | undefined> = new vscode.EventEmitter<CDApplication | undefined>();
    readonly onDidChangeTreeData: vscode.Event<CDApplication | undefined> = this._onDidChangeTreeData.event;

    public cdUtil: CDUtil;

    constructor() {
        this.cdUtil = new CDUtil();
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
                    return this.cdUtil.getDeploymentGroup();
                    break;

                case "deploymentGroup":
                    return this.cdUtil.getDeploymentGroupInfoTreeItem(element.label);
                    break;

                case "deployments":
                    return this.cdUtil.getDeployments();
                    break;

                case "deployment":
                    return this.cdUtil.getDeploymentTargetTreeItems(element.label);
                    break;

                case "ec2TagFilters":
                    return this.cdUtil.listEC2TagFilters();
                    break;

                default:
                    break;
            }
        }
        else {
            return vscode.window.withProgress({
                cancellable: false,
                location: vscode.ProgressLocation.Window,
                title: "Fetching CodeDeploy application"
            },
                async (progress, token) => {
                    return [await this.cdUtil.getApplication()]
                });
        }
    }

    applicationTreeItems() {

        let treeItems: vscode.TreeItem[] = [];

        let labels = [
            {
                "label": "Deployment Groups",
                "contextValue": "deploymentGroups"
            },
            {
                "label": "Deployments",
                "contextValue": "deployments"
            }
        ];

        labels.forEach(element => {
            treeItems.push(TreeItemUtil.addCollapsedItem(element.label, element.contextValue));
        });

        return treeItems;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async select() {
        await this.cdUtil.getExistingCodeDeploy();
        this.refresh();
    }

    async create() {
        await this.cdUtil.scaffoldApplication();
        this.refresh();
    }

    async deploy() {
        this.cdUtil.deploy();
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

    async addASG() {
        await this.cdUtil.addASG();
        this.refresh();
    }

    async addEC2Tag() {
        await this.cdUtil.addEC2Tag();
        this.refresh();
    }

    async delete(node: vscode.TreeItem) {

        await this.cdUtil.delete(node);
        this.refresh();
    }

    viewDeployment(node: any) {
        this.cdUtil.viewDeployment(node.label);
    }
}