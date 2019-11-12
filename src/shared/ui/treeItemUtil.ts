import * as vscode from "vscode";
import * as path from "path";

export class TreeItemUtil {

    static addProperty(key: string, value: string, contextValue: string = "", includeIcon: boolean = true): vscode.TreeItem {

        let treeItem = new vscode.TreeItem(`${key}=${value}`, vscode.TreeItemCollapsibleState.None);

        treeItem.contextValue = contextValue;
        if (includeIcon) treeItem.iconPath = {
            light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/constant.svg")),
            dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/constant.svg"))
        };

        return treeItem;
    }

    static addCollapsedItem(label: string, contextValue: string, iconfsPath: string = ""): vscode.TreeItem {

        let treeItem = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);

        treeItem.contextValue = contextValue;
        treeItem.iconPath = iconfsPath;

        return treeItem;
    }

}