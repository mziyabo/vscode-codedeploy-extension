import { join } from 'path';
import { Uri } from 'vscode';

/**
 * Whether Dark/Light Theme
 */
enum themeType {
    dark,
    light
};

/**
 * Get Icon URI
 * @param name Icon Name
 * @param theme Theme Type
 */
function getIconUri(name: string, theme: themeType) {
    return Uri.file(join(__dirname, "..", `resources/${themeType[theme]}/${name}.svg`));
}

export const TreeItemIcons =
{
    Autoscaling: {
        light: getIconUri('autoscaling', themeType.light),
        dark: getIconUri('autoscaling', themeType.dark)
    },
    Target: {
        Succeeded: {
            light: getIconUri('succeededTarget', themeType.light),
            dark: getIconUri('succeededTarget', themeType.dark)
        },
        Failed: {
            light: getIconUri('errorTarget', themeType.light),
            dark: getIconUri('errorTarget', themeType.dark)
        },
        InProgress: {
            light: getIconUri('pendingTarget', themeType.light),
            dark: getIconUri('pendingTarget', themeType.dark)
        },
        Unknown: {
            light: getIconUri('unknownTarget', themeType.light),
            dark: getIconUri('unknownTarget', themeType.dark)
        }
    },
    Deployment: {
        Failed: {
            light: getIconUri('error', themeType.light),
            dark: getIconUri('error', themeType.dark)
        },
        Succeeded: {
            light: getIconUri('check', themeType.light),
            dark: getIconUri('check', themeType.dark)
        },
        Stopped: {
            light: getIconUri('stopped', themeType.light),
            dark: getIconUri('stopped', themeType.dark)
        },
        InProgress: {
            light: getIconUri('progress', themeType.light),
            dark: getIconUri('progress', themeType.dark)
        },
        Default: {
            light: getIconUri('progress', themeType.light),
            dark: getIconUri('progress', themeType.dark)
        }
    },
    EC2Tag: {
        light: getIconUri('tag', themeType.light),
        dark: getIconUri('tag', themeType.dark),
    },
    Application: {
        light: getIconUri('codedeploy', themeType.light),
        dark: getIconUri('codedeploy', themeType.dark)
    },
    Property:
    {
        light: getIconUri('constant', themeType.light),
        dark: getIconUri('constant', themeType.dark)
    }
};