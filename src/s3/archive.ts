let AWS = require("aws-sdk");
import * as vscode from 'vscode';

/**
 * CodeDeploy archive utility
 */
class ArchiveUtil {

    private conf;

    constructor() {
        this.conf = vscode.workspace.getConfiguration("codedeploy");
    }

    async Zip() {
        let binDirectory = this.conf.get("deployBucket");
    }
}