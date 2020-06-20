import { Uri, workspace, WorkspaceEdit, Position, window, TreeItem } from "vscode";
import path = require("path");
import { CodeDeployUtil } from "../../shared/aws/codedeploy";

/**
 * Displays CodeDeploy DeploymentGroup Information
 * @param deploymentGroup
 */
export async function viewDeploymentGroup(node: TreeItem) {

    const deploymentGroup = node.label;
    const codedeploy = new CodeDeployUtil();

    const response = await codedeploy.getDeploymentGroup(deploymentGroup);
    const uri = Uri.parse(`untitled:${path.join(`${deploymentGroup}.json`)}`);

    workspace.openTextDocument(uri).then((document) => {
        const edit = new WorkspaceEdit();
        edit.insert(uri, new Position(0, 0), JSON.stringify(response, null, "\t"));
        return workspace.applyEdit(edit).then((success) => {
            if (success) {
                window.showTextDocument(document);
            } else {
                window.showInformationMessage('Unknown Error');
            }
        });
    });
}