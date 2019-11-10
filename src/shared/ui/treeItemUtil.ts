import * as vscode from "vscode";
import * as path from "path";

export class TreeItemUtil {

    static addProperty(key: string, value: string, contextValue: string = ""): vscode.TreeItem {

        let treeItem = new vscode.TreeItem(`${key}=${value}`, vscode.TreeItemCollapsibleState.None);
        treeItem.iconPath = vscode.Uri.file(path.join(__dirname, "../../resources/light/constant.svg"));
        treeItem.contextValue = contextValue;

        return treeItem;
    }

    static addCollapsedItem(label: string, contextValue: string, iconfsPath:string=""): vscode.TreeItem {

        let treeItem = new vscode.TreeItem(`${label}`, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.iconPath = iconfsPath;
        
        return treeItem;
    }
    
}