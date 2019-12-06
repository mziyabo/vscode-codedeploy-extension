import * as vscode from 'vscode';
import { CDApplication } from "./models/cdmodels";
import { CodeDeployUtil } from './aws/codedeploy/codedeploy';

export class CodeDeployTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<CDApplication | undefined> = new vscode.EventEmitter<CDApplication | undefined>();
    readonly onDidChangeTreeData: vscode.Event<CDApplication | undefined> = this._onDidChangeTreeData.event;

    public cdUtil: CodeDeployUtil;
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.cdUtil = new CodeDeployUtil();
        this.config = vscode.workspace.getConfiguration("codedeploy");
    }

    async getTreeItem(element: vscode.TreeItem): Promise<vscode.TreeItem> {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {

        if (!vscode.workspace.workspaceFolders)
            return;

        this.config = vscode.workspace.getConfiguration("codedeploy");

        if (!this.config.get("applicationName")) {

            if (this.config.get("isApplicationWorkspace")) {
                await this.config.update("isApplicationWorkspace", undefined);
            }

            return;
        }

        await this.config.update("isApplicationWorkspace", true);

        if (element) {

            let deploymentGroup: string;
            let contextValue = element.contextValue;

            switch (contextValue) {
                case "application":
                    return this.cdUtil.getApplicationTreeItems();

                case "deploymentGroups":
                    return await this.cdUtil.getDeploymentGroupsTreeItems();

                case "deploymentGroup":
                    return this.cdUtil.getDeploymentGroupTreeItem(element.label);

                case "deployments":
                    deploymentGroup = element.id.substr(20, element.id.length);
                    return this.cdUtil.getDeployments(deploymentGroup);

                case "deployment":
                    return this.cdUtil.getDeploymentTargetTreeItems(element.label);

                case "ec2TagFilters":
                    deploymentGroup = element.id.substr(15, element.id.length);
                    return this.cdUtil.listEC2TagFilters(deploymentGroup);

                case "autoScalingGroups":
                    deploymentGroup = element.id.substr(12, element.id.length)
                    return this.cdUtil.getAutoScalingGroups(deploymentGroup);

                default:
                    break;
            }
        }
        else {
            return vscode.window.withProgress({
                cancellable: false,
                location: vscode.ProgressLocation.Window,
                title: "Retrieving CodeDeploy Application"
            },
                async (progress, token) => {
                    return [await this.cdUtil.getApplication()]
                });
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

}