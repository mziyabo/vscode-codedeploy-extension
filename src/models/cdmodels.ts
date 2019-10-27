import * as path from 'path';
import * as vscode from 'vscode';

export class CDApplication extends vscode.TreeItem {

    public DeploymentGroup: CDDeploymentGroup;
    public Deployments: CDDeployment[];
    public Data;

    contextValue = 'application';
    iconPath = vscode.Uri.file(path.join(__dirname, "../resources/light/codedeploy.svg"));

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

    constructor(
        _label: string = "CodeDeploy Deployment",
        _collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed,
        public readonly command?: vscode.Command
    ) {
        super(_label, _collapsibleState)
        //TODO: initialize
    }
}
