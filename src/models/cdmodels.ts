import * as vscode from 'vscode';
import { TreeItemIcons } from '../shared/ui/icons';

export class CDApplication extends vscode.TreeItem {

    public DeploymentGroup: CDDeploymentGroup;
    public Deployments: CDDeployment[];
    public Data;

    contextValue = 'application';
    iconPath = TreeItemIcons.Application;

    constructor(
        _label: string = "CodeDeploy Application",
        _collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed,
        public readonly command?: vscode.Command
    ) {
        super(_label, _collapsibleState)
        //TODO: initialize
    }
}

export class CDDeploymentGroup extends vscode.TreeItem {

    public Deployments: CDDeployment[];
    contextValue = 'deploymentGroup';
    Data: any;

    constructor(
        _label: string = "CodeDeploy Deployment Group",
        _collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed,
        public readonly command?: vscode.Command
    ) {
        super(_label, _collapsibleState)
        //TODO: initialize
    }
}

export class CDDeployment extends vscode.TreeItem {

    contextValue = 'deployment';
    public Data;

    constructor(
        _label: string = "CodeDeploy Deployment",
        _collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed,
        public readonly command?: vscode.Command
    ) {
        super(_label, _collapsibleState)
        //TODO: initialize
    }
}
