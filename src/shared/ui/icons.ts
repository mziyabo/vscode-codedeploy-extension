import * as path from 'path';
import * as vscode from 'vscode';

export let TreeItemIcons =
{
    "Target": {
        "Succeeded": {
            light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/succeededTarget.svg")),
            dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/succeededTarget.svg"))
        },
        "Failed": {
            light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/errorTarget.svg")),
            dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/errorTarget.svg"))
        },
        "InProgress": {
            light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/pendingTarget.svg")),
            dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/pendingTarget.svg"))
        },
        "Unknown": {
            light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/unknownTarget.svg")),
            dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/unknownTarget.svg"))
        }
    },
    "Deployment": {
        "Failed": {
            light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/error.svg")),
            dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/error.svg"))
        },
        "Succeeded": {
            light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/check.svg")),
            dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/check.svg"))
        },
        "Stopped": {
            light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/stopped.svg")),
            dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/stopped.svg"))
        },
        "InProgress": {
            light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", `resources/light/progress.svg`)),
            dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", `resources/dark/progress.svg`))
        },
        "Default": {
            light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", `resources/light/progress.svg`)),
            dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", `resources/dark/progress.svg`))
        }
    },
    "EC2Tag": {
        light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/tag.svg")),
        dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/tag.svg")),
    },
    "Application": {
        light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/codedeploy.svg")),
        dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/codedeploy.svg")),
    },
    "Property":
    {
        light: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/light/constant.svg")),
        dark: vscode.Uri.file(path.join(__dirname, "..", "..", "..", "resources/dark/constant.svg"))
    }
}

