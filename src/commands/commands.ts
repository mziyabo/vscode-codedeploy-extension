import { commands, window, workspace } from 'vscode';
import { CodeDeployUtil } from "../shared/aws/codedeploy";
import { CodeDeployTreeDataProvider } from "../dataprovider";
import { openConsole } from "./openInConsole";
import { createApplication } from "./application/createApplication";
import { selectApplication } from "./application/addExistingApplication";
import { deleteApplication } from "./application/deleteApplication";
import { createDeployment } from "./deployment/createDeployment";
import { stopDeployment } from "./deployment/stopDeployment";
import { createDeploymentGroup } from "./deploymentGroup/createDeploymentGroup";
import { deleteDeploymentGroup } from "./deploymentGroup/deleteDeploymentGroup";
import { addEC2Tag } from "./deploymentGroup/addEC2Tag";
import { addASG } from "./deploymentGroup/addASG";
import { removeASG } from "./deploymentGroup/removeASG";
import { deleteEC2TagFilter } from "./deploymentGroup/deleteEC2TagFilter";
import { unlinkWorkspace } from "./unlinkWorkspace";
import { addLoadBalancerInfo } from './deploymentGroup/addELB';
import { removeELB } from './deploymentGroup/removeELB';
import { editDeploymentGroup } from './deploymentGroup/editDeploymentGroup';
import { configureBGDeployment } from './deploymentGroup/configureBGDeployment';
import { viewDeploymentGroup } from './deploymentGroup/viewDeploymentGroup';
const nls = require('vscode-nls');

export class CDExtension {

    codedeploy: CodeDeployUtil;
    dataProvider: CodeDeployTreeDataProvider;

    constructor() {
        this.codedeploy = new CodeDeployUtil();
        this.dataProvider = new CodeDeployTreeDataProvider();
        const localize = nls.config({ messageFormat: nls.MessageFormat.file })();
    }

    activate() {

        this.registerEvents();
        window.registerTreeDataProvider('cdExplorer', this.dataProvider);

        commands.registerCommand('cdExplorer.deploy', (node) => createDeployment(node));
        commands.registerCommand('cdExplorer.refresh', () => this.dataProvider.refresh());
        commands.registerCommand('cdExplorer.selectApplication', () => selectApplication(), this);
        commands.registerCommand('cdExplorer.createApplication', () => createApplication());
        commands.registerCommand('cdExplorer.createDeploymentGroup', () => createDeploymentGroup());
        commands.registerCommand('cdExplorer.addEC2Tag', (node) => addEC2Tag(node));
        commands.registerCommand('cdExplorer.addASG', (node) => addASG(node));
        commands.registerCommand('cdExplorer.configureRevisionLocations', () => this.codedeploy.configureRevisionLocations());
        commands.registerCommand('cdExplorer.deleteApplication', (node) => { deleteApplication(node); }, this);
        commands.registerCommand('cdExplorer.deleteDeploymentGroup', (node) => { deleteDeploymentGroup(node); }, this);
        commands.registerCommand('cdExplorer.openconsole', (node) => { openConsole(node); }, this);
        commands.registerCommand('cdExplorer.viewDeployment', (node) => { this.codedeploy.viewDeployment(node.label); }, this);
        commands.registerCommand('cdExplorer.unlinkWorkspace', () => unlinkWorkspace(), this);
        commands.registerCommand('cdExplorer.deleteEC2Tag', (node) => deleteEC2TagFilter(node));
        commands.registerCommand('cdExplorer.deleteASG', (node) => removeASG(node));
        commands.registerCommand('cdExplorer.stopDeployment', (node) => stopDeployment(node));
        commands.registerCommand('cdExplorer.addLoadBalancerInfo', (node) => addLoadBalancerInfo(node));
        commands.registerCommand('cdExplorer.removeELB', (node) => removeELB(node));
        commands.registerCommand('cdExplorer.editDeploymentGroup', (node) => editDeploymentGroup(node));
        commands.registerCommand('cdExplorer.configureBGDeployment', (node) => configureBGDeployment(node));
        commands.registerCommand('cdExplorer.viewDeploymentGroup', (node) => viewDeploymentGroup(node));
        // commands.registerCommand('cdExplorer.showDeploymentWebView', showDeploymentWebView);
    }

    registerEvents() {
        workspace.onDidChangeConfiguration((change) => {
            if (change.affectsConfiguration('codedeploy')) {
                commands.executeCommand("cdExplorer.refresh");
            }
        });
    }
}