import * as vscode from 'vscode';
let AWS = require("aws-sdk");
let AdmZip = require("adm-zip");

export class S3Util {

    private s3;
    private conf;

    constructor() {
        this.conf = vscode.workspace.getConfiguration("codedeploy");
    }

    async upload(buffer: Buffer, bucketName, revisionName) {

        let s3 = new AWS.S3({
            apiVersion: '2006-03-01',
            region: this.conf.get("region")
        });

        var params = {
            Body: buffer,
            Bucket: bucketName,
            Key: revisionName
        };

        let response = await s3.putObject(params).promise();

        console.log(`Uploaded CodeDeploy Revision: ${response.ETag}`);
        return revisionName;

    }

    /**
     * Creates a ZIP to upload to S3 as the CodeDeploy revision
     * @param binDir Local revision directory
     */
    archive(binDir: string) {

        // TODO: validate workspace directory
        var zip = new AdmZip();
        zip.addLocalFolder(binDir);

        return zip.toBuffer();
    }

}