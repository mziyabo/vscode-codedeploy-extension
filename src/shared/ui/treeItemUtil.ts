import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { TreeItemIcons } from "./icons";

interface TreeItemOptions {
    id?: string;
    /**
     *
     */
    tooltip?: string;
    iconPath?: string | import("vscode").Uri | { light: string | import("vscode").Uri; dark: string | import("vscode").Uri } | import("vscode").ThemeIcon;
    /**
     * A human-readable string describing this item
     */
    label: string;
    /**
     * Context value of the tree item.
     */
    contextValue: string;
    /**
     * Collapsible state of the tree item
     */
    collapsibleState?: TreeItemCollapsibleState;
    description?: string;
}

/**
 * TreeItem Helper Class (WIP)
 */
export class TreeItemUtil {

    static addProperty(key: string, value: string, contextValue: string = "", includeIcon: boolean = true): TreeItem {

        const treeItem = new TreeItem(`${key}=${value}`, TreeItemCollapsibleState.None);
        treeItem.contextValue = contextValue;

        if (includeIcon) {
            treeItem.iconPath = TreeItemIcons.Property;
        }

        return treeItem;
    }

    static TreeItem(options: TreeItemOptions): TreeItem {

        if (options.collapsibleState === undefined) {
            options.collapsibleState = TreeItemCollapsibleState.Collapsed;
        }

        const item = new TreeItem(options.label, options.collapsibleState);
        item.description = options.description;
        item.contextValue = options.contextValue;
        item.id = options.id;
        item.iconPath = options.iconPath;
        item.tooltip = options.tooltip;
        return item;
    }
}