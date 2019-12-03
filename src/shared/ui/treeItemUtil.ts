import * as vscode from "vscode";
import { TreeItemIcons } from "./icons";

export class TreeItemUtil {

    static addProperty(key: string, value: string, contextValue: string = "", includeIcon: boolean = true): vscode.TreeItem {

        let treeItem = new vscode.TreeItem(`${key}=${value}`, vscode.TreeItemCollapsibleState.None);

        treeItem.contextValue = contextValue;
        if (includeIcon) {
            treeItem.iconPath = TreeItemIcons.Property;
        }

        return treeItem;
    }

    static addCollapsedItem(label: string, contextValue: string, iconfsPath: string = ""): vscode.TreeItem {

        let treeItem = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);

        treeItem.contextValue = contextValue;
        treeItem.iconPath = iconfsPath;

        return treeItem;
    }

}