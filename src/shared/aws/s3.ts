const AdmZip = require("adm-zip");
import { QuickPickItem } from '../ui/input';
import { AWSClient, Service } from './awsclient';

/**
 * Wraps AWS S3 Client
 */
export class S3Util {

    async upload(buffer: Buffer, bucketName, revisionName) {

        const params = {
            Body: buffer,
            Bucket: bucketName,
            Key: revisionName
        };

        const response = await AWSClient.executeAsync(Service.S3, "putObject", params);
        return response.ETag;
    }

    /**
     * Creates a ZIP to upload to S3 as the CodeDeploy revision
     * @param binDir Local revision directory
     */
    archive(binDir: string) {

        // TODO: validate workspace directory
        const zip = new AdmZip();
        zip.addLocalFolder(binDir);

        return zip.toBuffer();
    }

    /**
     * Returns S3 Buckets as QuickPickItem Array
     */
    async getS3BucketsAsQuickItem(): Promise<QuickPickItem[]> {

        const buckets: QuickPickItem[] = [];

        const params = {};
        const response = await AWSClient.executeAsync(Service.S3, "listBuckets", params);

        response.Buckets.forEach((bucket) => {
            buckets.push(new QuickPickItem({
                label: bucket.Name,
                description: ""
            }));
        });

        return buckets;
    }
}