import { S3Util } from '../../shared/aws/s3';
import { config } from '../../shared/config';
import { CodeDeployUtil } from '../../shared/aws/codedeploy';
import { ProgressLocation, commands, TreeItem, window, Uri } from 'vscode';
import { Dialog } from '../../shared/ui/dialog';
import { DialogInput, QuickPickItem } from '../../shared/ui/input';
const nls = require('vscode-nls');
const localize = nls.loadMessageBundle();

/**
 * Create Deployment
 * @param node DeploymentGroup TreeItem
 */
export async function createDeployment(node: TreeItem) {

    const deploymentGroup = node.label;
    const codedeploy = new CodeDeployUtil();

    try {
        const s3: S3Util = new S3Util();
        const buckets: QuickPickItem[] = await s3.getS3BucketsAsQuickItem();
        const dialog = createDialog(buckets);

        await dialog.run();
        if (!dialog.cancelled) {

            await config.update("revisionBucket", dialog.getResponse("bucket"));
            await config.update("revisionLocalDirectory", dialog.getResponse("localDir").uri.fsPath);
            const revisionName = dialog.getResponse("revisionName");

            // Upload Revision to S3
            const revisionEtag = await window.withProgress({
                cancellable: false,
                location: ProgressLocation.Notification,
                title: `Uploading Revision to S3`
            }, async () => {
                const s3 = new S3Util();
                const buffer = s3.archive(config.get("revisionLocalDirectory").toString());
                return await s3.upload(buffer, config.get("revisionBucket"), revisionName);
            });

            // Create Deployment
            if (revisionEtag) {
                const params = {
                    applicationName: config.get("applicationName"),
                    deploymentGroupName: deploymentGroup,
                    revision: {
                        s3Location: {
                            bucket: config.get("revisionBucket"),
                            key: revisionName,
                            eTag: revisionEtag,
                            bundleType: "zip"
                        },
                        revisionType: "S3"
                    }
                };

                const response = await window.withProgress({
                    cancellable: false,
                    location: ProgressLocation.Notification,
                    title: "Creating Deployment"
                }, async () => {
                    return await codedeploy.createDeployment(params);
                });

                if (response) {

                    const deploymentId = response.deploymentId;
                    const progress = window.createStatusBarItem();
                    progress.text = `$(sync~spin) Deployment ${deploymentId} InProgress`;
                    progress.show();

                    await codedeploy.waitForDeployment({
                        deploymentId: deploymentId
                    }, function (err, data) {
                        if (err) {
                            commands.executeCommand('cdExplorer.refresh');
                            progress.hide();
                        }
                        else {
                            if (data.deploymentInfo.status !== "InProgress") {
                                commands.executeCommand('cdExplorer.refresh');
                                progress.hide();
                            }
                        }
                    });

                    const trackInConsole = await window.showInformationMessage(`Open Deployment ${response.deploymentId} in AWS Console to track progress?`, "Yes", "No");
                    if (trackInConsole === "Yes") {
                        const uri = `${config.get("region")}.console.aws.amazon.com/codesuite/codedeploy/deployments/${response.deploymentId}`;
                        commands.executeCommand('vscode.open', Uri.parse(`https://${uri}`));
                    }
                }
            }

            commands.executeCommand("cdExplorer.refresh");
        }
    }
    catch (error) {
        window.showErrorMessage(error.message, {});
    }
}

function createDialog(buckets: QuickPickItem[]) {
    const dialog: Dialog = new Dialog("Create Deployment");

    dialog.addPrompt("revisionName", () => {
        return DialogInput.showInputBox("Enter Revision Name:", {
            step: 1,
            totalSteps: dialog.prompts.length,
            title: dialog.title,
            ignoreFocusOut: true,
            placeholder: `e.g. ${config.get("applicationName")}-1.0.0.zip`
        });
    });

    dialog.addPrompt("bucket", () => {
        return DialogInput.showQuickPick(buckets, {
            step: 2,
            totalSteps: dialog.prompts.length,
            title: dialog.title,
            canPickMany: false,
            placeHolder: "Select S3 Revision Bucket",
            ignoreFocusOut: true,
        });
    });

    dialog.addPrompt("localDir", async () => {
        return await window.showWorkspaceFolderPick({
            placeHolder: "Enter Local Revision Location:", ignoreFocusOut: true
        });
    });

    return dialog;
}