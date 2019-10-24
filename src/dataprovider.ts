let AWS = require("aws-sdk");
import * as vscode from 'vscode';
import { CDApplication, CDDeploymentGroup, CDDeployment } from "./model/model";
import { CDUtil } from './codedeploy/cdutil';


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

            let codedeploy = new AWS.CodeDeploy({
                apiVersion: '2014-10-06',
                region: await this.conf.get("region")
            });

            // Get CodeDeploy Application
            var applicationparams = {
                applicationName: await this.conf.get("applicationName")
            };
            var response = await codedeploy.getApplication(applicationparams).promise();

            let application: CDApplication;

            if (response.application) {
                application = new CDApplication(response.application.applicationName, vscode.TreeItemCollapsibleState.Collapsed);
                application.Data = response;
            }

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
            return;
        }

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
                    return await this.cdUtil.getApplication()
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
        this.conf = await this.cdUtil.updateExtensionConfig();
        this.refresh();
    }

    async create() {
        this.conf = await this.cdUtil.updateExtensionConfig();
        if (this.conf.get("applicationName")) {
            await this.cdUtil.scaffoldApplication();
            this.refresh();
        }
    }

    async deploy() {
        this.cdUtil.deploy();
        this.refresh();
    }

    viewDeployment(node: any) {
        this.cdUtil.viewDeployment(node.label);
    }

    /**
    * Retrieve AWS CodeDeploy Application
    */
    async initialize() {
        this.conf = vscode.workspace.getConfiguration("codedeploy");
        if (this.conf.get("applicationName")) {
            this.refresh();
        }
    }
}