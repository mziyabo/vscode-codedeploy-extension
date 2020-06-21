import { window, ProgressLocation, TreeItem } from 'vscode';
import { unlinkWorkspace } from "../unlinkWorkspace";
import { CodeDeployUtil } from '../../shared/aws/codedeploy';

/**
 * Delete CodeDeploy Application
 * @param node Application Treeitem
 */
export async function deleteApplication(node: TreeItem) {
    const codedeploy = new CodeDeployUtil();
    const applicationName = node.label;

    try {

        const confirmDelete = await window.showInformationMessage(`Are you sure you want to delete ${applicationName}?`, { modal: true }, "Delete");
        if (confirmDelete === "Delete") {

            const params = {
                applicationName: applicationName
            };

            return await window.withProgress(
                {
                    cancellable: false,
                    location: ProgressLocation.Notification,
                    title: `Deleting Application ${applicationName}`
                },
                async () => {

                    const response = await codedeploy.deleteApplication(params);
                    if (response) {
                        unlinkWorkspace();
                        return response;
                    }
                }
            );
        }
    } catch (error) {
        window.showErrorMessage(error.message, {});
    }
}