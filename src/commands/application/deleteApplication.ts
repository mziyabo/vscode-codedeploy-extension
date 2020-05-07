import * as vscode from 'vscode';
import { CDExtension } from '../commands';
import { unlinkWorkspace } from "../unlinkWorkspace";

export async function deleteApplication(node: vscode.TreeItem) {
    // TODO: prompt/warn user of deletion
    let extension = new CDExtension();
    let response = await extension.cdUtil.deleteApplication(node.label);

    if (response) {
        unlinkWorkspace();
    }
}