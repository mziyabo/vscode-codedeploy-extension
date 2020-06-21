import { config } from '../config';
import { window } from 'vscode';
const S3 = require("aws-sdk/clients/s3");
const CodeDeploy = require("aws-sdk/clients/codedeploy");
const ELB = require("aws-sdk/clients/elb");
const ELBv2 = require("aws-sdk/clients/elbv2");
const AutoScaling = require("aws-sdk/clients/autoscaling");
const IAM = require("aws-sdk/clients/iam");
const sdkconfig = require("aws-sdk/lib/config");

/**
 * AWS Service Names
 */
export enum Service {
    AutoScaling,
    CodeDeploy,
    ELBV2,
    ELB,
    IAM,
    S3
}

/**
 * AWS Client/Service proxy
 */
export class AWSClient {

    /**
     * Execute operation against AWS Service
     * @param service AWS Service
     * @param operation API action to execute against service
     * @param params Operation parameters
     * @param callback
     */
    public static async executeAsync(service: Service, operation: string, params: {}) {

        let response;
        if (config.get("enableAwsLogging")) {
            sdkconfig.logger = console;
        }

        try {
            const client = AWSClient.getClient(service);
            response = await client[operation](params).promise();
            return response;
        }
        catch (error) {
            window.showErrorMessage(`${error.code}: ${error.message}`, {
            });
        }
    }

    /**
     * Waits for a given AWS resource state
     * @param service AWS Service
     * @param state resourceState to waitFor
     * @param params Service Parameters
     * @param callback callback function
     */
    public static async waitForAsync(service: Service, state: string, params: {}, callback: any) {

        if (config.get("enableAwsLogging")) {
            sdkconfig.logger = console;
        }

        try {
            const client = AWSClient.getClient(service);
            return await client["waitFor"](state, params, callback);
        } catch (error) {
            window.showErrorMessage(error.message, {});
        }
    }

    private static getClient(service: Service) {
        let client;
        const region = { region: config.get("region") };
        switch (service) {
            case Service.CodeDeploy:
                client = new CodeDeploy(region);
                break;
            case Service.ELBV2:
                client = new ELBv2(region);
                break;
            case Service.ELB:
                client = new ELB(region);
                break;
            case Service.AutoScaling:
                client = new AutoScaling(region);
                break;
            case Service.S3:
                client = new S3(region);
                break;
            case Service.IAM:
                client = new IAM();
                break;
        }
        return client;
    }
}