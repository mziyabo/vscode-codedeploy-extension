import { QuickPickItem } from "../ui/input";
import { AWSClient, Service } from "./awsclient";

/**
 * Wraps AWS AutoScaling Client
 */
export class AutoScalingUtil {

    async getASGQuickPickItems(): Promise<QuickPickItem[]> {

        const asgs = await this.describeAutoScalingGroups();
        const autoscalingGroups: QuickPickItem[] = [];

        asgs.forEach((asg) => {
            autoscalingGroups.push(
                new QuickPickItem({
                    label: asg.AutoScalingGroupName,
                    description: ""
                })
            );
        });

        return autoscalingGroups;
    }

    async describeAutoScalingGroups(): Promise<any[]> {

        const response = await AWSClient.executeAsync(Service.AutoScaling, "describeAutoScalingGroups", {});
        return response.AutoScalingGroups;
    }
}