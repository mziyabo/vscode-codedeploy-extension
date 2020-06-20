import { ProgressLocation, window, TreeDataProvider, TreeItem, EventEmitter, workspace, Event } from 'vscode';
import { CodeDeployUtil } from './shared/aws/codedeploy';
import { config } from './shared/config';
import { CDApplication } from "./shared/models/cdmodels";

/**
 * AWS CodeDeploy TreeDataProvider
 */
export class CodeDeployTreeDataProvider implements TreeDataProvider<TreeItem> {

    private _onDidChangeTreeData: EventEmitter<CDApplication | undefined> = new EventEmitter<CDApplication | undefined>();
    readonly onDidChangeTreeData: Event<CDApplication | undefined> = this._onDidChangeTreeData.event;

    async getTreeItem(element: TreeItem): Promise<TreeItem> {
        return element;
    }

    async getChildren(element?: TreeItem): Promise<TreeItem[]> {

        if (workspace.workspaceFolders) {

            if (config.get("applicationName")) {
                await config.update("isApplicationWorkspace", true);
                const codedeploy = new CodeDeployUtil();

                if (element) {
                    let deploymentGroup: string;
                    const contextValue = element.contextValue;

                    switch (contextValue) {
                        case "application":
                            return codedeploy.getApplicationTreeItems();

                        case "deploymentGroups":
                            return await codedeploy.getDeploymentGroupsTreeItems();

                        case "deploymentGroup":
                            return codedeploy.getDeploymentGroupTreeItem(element.label);

                        case "dgSettings":
                            deploymentGroup = element.id.substr(element.id.indexOf('_') + 1, element.id.length);
                            return codedeploy.getDeploymentGroupSettings(deploymentGroup);

                        case "deployments":
                            deploymentGroup = element.id.substr(element.id.indexOf('_') + 1, element.id.length);
                            return codedeploy.getDeployments(deploymentGroup);

                        case "deployment":
                            return codedeploy.getDeploymentTargetTreeItems(element.label);

                        case "ec2TagFilters":
                            deploymentGroup = element.id.substr(element.id.indexOf('_') + 1, element.id.length);
                            return codedeploy.listEC2TagFilters(deploymentGroup);

                        case "autoScalingGroups":
                            deploymentGroup = element.id.substr(element.id.indexOf('_') + 1, element.id.length);
                            return codedeploy.getAutoScalingGroups(deploymentGroup);

                        case "loadBalancer":
                            deploymentGroup = element.id.substr(element.id.indexOf('_') + 1, element.id.length);
                            return codedeploy.getLoadBalancerInfo(deploymentGroup);

                        default:
                            break;
                    }
                }
                else {
                    return window.withProgress({
                        cancellable: false,
                        location: ProgressLocation.Window,
                        title: "Retrieving CodeDeploy Application"
                    },
                        async () => {
                            return [await codedeploy.getApplication()];
                        });
                }
            }
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}