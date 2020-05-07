let AWS = require("aws-sdk");
let AdmZip = require("adm-zip");
import * as vscode from 'vscode';
import { QuickPickItem } from '../ui/quickpickitem';

export class S3Util {

    private config;

    constructor() {
        this.config = vscode.workspace.getConfiguration("codedeploy");
        if (this.config.get("enableAwsLogging")) {
            AWS.config.logger = console;
        }
    }

    async upload(buffer: Buffer, bucketName, revisionName) {

        let s3 = new AWS.S3({
            apiVersion: '2006-03-01',
            region: this.config.get("region")
        });

        let params = {
            Body: buffer,
            Bucket: bucketName,
            Key: revisionName
        };

        let response = await s3.putObject(params).promise();

        console.log(`Uploaded CodeDeploy Revision: ${response.ETag}`);
        return response.ETag;

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


    /**
     * Returns S3 Buckets as QuickPickItem Array
     */
    async getS3BucketsAsQuickItem(): Promise<QuickPickItem[]> {

        let buckets: vscode.QuickPickItem[] = [];

        let s3 = new AWS.S3({
            apiVersion: '2006-03-01',
            region: this.config.get("region")
        });

        let params = {}
        let response = await s3.listBuckets(params).promise();

        response.Buckets.forEach(bucket => {
            buckets.push(new QuickPickItem(bucket.Name, ""));
        });

        return buckets;
    }

}