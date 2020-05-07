import { join } from 'path';
import { Uri } from 'vscode';

export let TreeItemIcons =
{
    "Target": {
        "Succeeded": {
            light: Uri.file(join(__dirname, "..", "resources/light/succeededTarget.svg")),
            dark: Uri.file(join(__dirname, "..", "resources/dark/succeededTarget.svg"))
        },
        "Failed": {
            light: Uri.file(join(__dirname, "..", "resources/light/errorTarget.svg")),
            dark: Uri.file(join(__dirname, "..", "resources/dark/errorTarget.svg"))
        },
        "InProgress": {
            light: Uri.file(join(__dirname, "..", "resources/light/pendingTarget.svg")),
            dark: Uri.file(join(__dirname, "..", "resources/dark/pendingTarget.svg"))
        },
        "Unknown": {
            light: Uri.file(join(__dirname, "..", "resources/light/unknownTarget.svg")),
            dark: Uri.file(join(__dirname, "..", "resources/dark/unknownTarget.svg"))
        }
    },
    "Deployment": {
        "Failed": {
            light: Uri.file(join(__dirname, "..", "resources/light/error.svg")),
            dark: Uri.file(join(__dirname, "..", "resources/dark/error.svg"))
        },
        "Succeeded": {
            light: Uri.file(join(__dirname, "..", "resources/light/check.svg")),
            dark: Uri.file(join(__dirname, "..", "resources/dark/check.svg"))
        },
        "Stopped": {
            light: Uri.file(join(__dirname, "..", "resources/light/stopped.svg")),
            dark: Uri.file(join(__dirname, "..", "resources/dark/stopped.svg"))
        },
        "InProgress": {
            light: Uri.file(join(__dirname, "..", `resources/light/progress.svg`)),
            dark: Uri.file(join(__dirname, "..", `resources/dark/progress.svg`))
        },
        "Default": {
            light: Uri.file(join(__dirname, "..", `resources/light/progress.svg`)),
            dark: Uri.file(join(__dirname, "..", `resources/dark/progress.svg`))
        }
    },
    "EC2Tag": {
        light: Uri.file(join(__dirname, "..", "resources/light/tag.svg")),
        dark: Uri.file(join(__dirname, "..", "resources/dark/tag.svg")),
    },
    "Application": {
        light: Uri.file(join(__dirname, "..", "resources/light/codedeploy.svg")),
        dark: Uri.file(join(__dirname, "..", "resources/dark/codedeploy.svg")),
    },
    "Property":
    {
        light: Uri.file(join(__dirname, "..", "resources/light/constant.svg")),
        dark: Uri.file(join(__dirname, "..", "resources/dark/constant.svg"))
    }
}