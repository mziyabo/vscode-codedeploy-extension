import { AWSClient, Service } from "./awsclient";
import { QuickPickItem } from "../ui/input";

/**
 * Wraps AWS ELB/ELBv2 Clients
 */
export class ELBUtil {

    async getLoadBalancers(): Promise<QuickPickItem[]> {

        const loadBalancers: QuickPickItem[] = [];
        const elbs = await AWSClient.executeAsync(Service.ELB, "describeLoadBalancers", {});

        elbs.LoadBalancerDescriptions.forEach((elb) => {
            loadBalancers.push(new QuickPickItem({
                label: elb.LoadBalancerName,
                description: `${elb.Scheme} CLB`
            }));
        });

        return loadBalancers;
    }

    async getELBv2(elbName: string) {
        return await AWSClient.executeAsync(Service.ELBV2, "describeLoadBalancers", {
            Names: [elbName]
        });
    }

    async getELB(elbName: string) {
        return await AWSClient.executeAsync(Service.ELB, "describeLoadBalancers", {
            LoadBalancerNames: [elbName]
        });
    }

    async getTargetGroups(name?: any) {
        return await AWSClient.executeAsync(Service.ELBV2, "describeTargetGroups", {
            Names: [name]
        });
    }
}