import * as vscode from 'vscode';
import { CDApplication } from "./models/cdmodels";
import { CDUtil } from './codedeploy/cdutil';
import { Dialog } from './shared/ui/dialog';

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
                    return this.applicationCtxTreeItems();
                    break;

                case "deploymentGroups":
                    return this.cdUtil.getDeploymentGroup();
                    break;

                case "deployments":
                    return this.cdUtil.getDeployments();
                    break;

                case "deployment":
                    let targets = new vscode.TreeItem("Targets", vscode.TreeItemCollapsibleState.Collapsed);
                    targets.iconPath = "Folder";
                    return [targets];
                    break;

                default:
                    break;
            }
        }
        else {

            return vscode.window.withProgress({
                cancellable: false,
                location: vscode.ProgressLocation.Notification,
                title: "Fetching CodeDeploy application"
            },
                async (progress, token) => {
                    return [await this.cdUtil.getApplication()]
                });
        }
    }

    async applicationCtxTreeItems() {
        var treeItems = []

        var labels = [
            {
                "label": "Deployment Groups",
                "contextValue": "deploymentGroups"
            },
            {
                "label": "Deployment Configurations",
                "contextValue": "deploymentConfigs"
            }
            , {
                "label": "Deployments",
                "contextValue": "deployments"
            }];

        labels.forEach(element => {
            var treeItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
            treeItem.contextValue = element.contextValue;

            treeItems.push(treeItem)
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
        
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse("https://"+uri));
    }

    configureRevisionLocations(): any {
        this.cdUtil.configureRevisionLocations();
    }

    delete(node: vscode.TreeItem) {

        this.cdUtil.delete(node);
        this.refresh();
    }

    viewDeployment(node: any) {
        this.cdUtil.viewDeployment(node.label);
    }
}