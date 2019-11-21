let AWS = require("aws-sdk");
import * as vscode from "vscode";
import { QuickPickItem } from "../../shared/ui/quickpickitem";

export class autoscalingUtil {

    conf;

    constructor() {
        this.conf = vscode.workspace.getConfiguration("codedeploy");
    }

    async getAsgsAsQuickPickItems(): Promise<QuickPickItem[]> {
        
        let asgs:any[]=  await this.describeAutoScalingGroups();
        let autoscalingGroups:QuickPickItem[] = [];
        
        asgs.forEach(asg => {
            let item = new QuickPickItem(asg.AutoScalingGroupName, "");
            autoscalingGroups.push(item);
        });

        return autoscalingGroups;
    }

    async describeAutoScalingGroups():Promise<any []>{
        
        let client = new AWS.AutoScaling({
            apiVersions: "2011-01-01",
            region: this.conf.get("region")
        });

        let response = await client.describeAutoScalingGroups({}).promise();

        return response.AutoScalingGroups;
    }

}