import * as vscode from 'vscode';
import { CodeDeployUtil } from "../shared/aws/codedeploy";
import { CodeDeployTreeDataProvider } from "../dataprovider";
import { openConsole } from "./openInConsole";
import { createApplication } from "./application/createApplication";
import { selectApplication } from "./application/addExistingApplication";
import { deleteApplication } from "./application/deleteApplication";
import { startDeployment } from "./deployment/startDeployment";
import { stopDeployment } from "./deployment/stopDeployment";
import { createDeploymentGroup } from "./deploymentGroup/createDeploymentGroup";
import { deleteDeploymentGroup } from "./deploymentGroup/deleteDeploymentGroup";
import { addEC2Tag } from "./deploymentGroup/addEC2Tag";
import { addASG } from "./deploymentGroup/addASG";
import { removeASG } from "./deploymentGroup/removeASG";
import { deleteEC2TagFilter } from "./deploymentGroup/deleteEC2TagFilter";
import { unlinkWorkspace } from "./unlinkWorkspace";

export class CDExtension {

    cdUtil: CodeDeployUtil;
    config: vscode.WorkspaceConfiguration;
    dataProvider: CodeDeployTreeDataProvider;

    constructor() {
        this.cdUtil = new CodeDeployUtil();
        this.config = vscode.workspace.getConfiguration("codedeploy");
        this.dataProvider = new CodeDeployTreeDataProvider();
    }

    Activate() {

        vscode.window.registerTreeDataProvider('cdExplorer', this.dataProvider);

        vscode.commands.registerCommand('cdExplorer.deploy', node => startDeployment(node));
        vscode.commands.registerCommand('cdExplorer.refresh', () => this.dataProvider.refresh());
        vscode.commands.registerCommand('cdExplorer.selectApplication', () => selectApplication(), this);
        vscode.commands.registerCommand('cdExplorer.createApplication', () => createApplication());
        vscode.commands.registerCommand('cdExplorer.createDeploymentGroup', () => createDeploymentGroup());
        vscode.commands.registerCommand('cdExplorer.addEC2Tag', node => addEC2Tag(node));
        vscode.commands.registerCommand('cdExplorer.addASG', node => addASG(node));
        vscode.commands.registerCommand('cdExplorer.configureRevisionLocations', () => this.cdUtil.configureRevisionLocations());
        vscode.commands.registerCommand('cdExplorer.deleteApplication', node => { deleteApplication(node) }, this);
        vscode.commands.registerCommand('cdExplorer.deleteDeploymentGroup', node => { deleteDeploymentGroup(node) }, this);
        vscode.commands.registerCommand('cdExplorer.openconsole', node => { openConsole(node) }, this);
        vscode.commands.registerCommand('cdExplorer.viewDeployment', node => { this.cdUtil.viewDeployment(node.label); }, this);
        vscode.commands.registerCommand('cdExplorer.unlinkWorkspace', () => unlinkWorkspace(), this);
        vscode.commands.registerCommand('cdExplorer.deleteEC2Tag', node => deleteEC2TagFilter(node));
        vscode.commands.registerCommand('cdExplorer.deleteASG', node => removeASG(node));
        vscode.commands.registerCommand('cdExplorer.stopDeployment', node => stopDeployment(node));

    }
}
