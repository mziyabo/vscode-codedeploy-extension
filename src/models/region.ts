import { QuickPickItem } from "../shared/ui/quickpickitem";

export class AWSRegions {

    static regions = [
        {
            "description": "This region is recommended to serve users in the eastern United States",
            "displayName": "US East (N. Virginia)",
            "name": "us-east-1"
        },
        {
            "description": "This region is recommended to serve users in the eastern United States",
            "displayName": "US East (Ohio)",
            "name": "us-east-2"
        },
        {
            "description": "This region is recommended to serve users in the northwestern United States, Alaska, and western Canada",
            "displayName": "US West (Oregon)",
            "name": "us-west-2"
        },
        {
            "description": "This region is recommended to serve users in Ireland, the United Kingdom, and Iceland",
            "displayName": "EU (Ireland)",
            "name": "eu-west-1"
        },
        {
            "description": "This region is recommended to serve users in Ireland, the United Kingdom, and Iceland",
            "displayName": "EU (London)",
            "name": "eu-west-2"
        },
        {
            "description": "This region is recommended to serve users in France and central Europe",
            "displayName": "EU (Paris)",
            "name": "eu-west-3"
        },
        {
            "description": "This region is recommended to serve users in Europe, the Middle East, and Africa",
            "displayName": "EU (Frankfurt)",
            "name": "eu-central-1"
        },
        {
            "description": "This region is recommended to serve users in India and Southeast Asia",
            "displayName": "Asia Pacific (Singapore)",
            "name": "ap-southeast-1"
        },
        {
            "description": "This region is recommended to serve users in Austalia, New Zealand, and the South Pacific",
            "displayName": "Asia Pacific (Sydney)",
            "name": "ap-southeast-2"
        },
        {
            "description": "This region is recommended to serve users in Japan",
            "displayName": "Asia Pacific (Tokyo)",
            "name": "ap-northeast-1"
        },
        {
            "description": "This region is recommended to serve users in South Korea",
            "displayName": "Asia Pacific (Seoul)",
            "name": "ap-northeast-2"
        },
        {
            "description": "This region is recommended to serve users in India and southern Asia",
            "displayName": "Asia Pacific (Mumbai)",
            "name": "ap-south-1"
        },
        {
            "description": "This region is recommended to serve users in eastern and central Canada",
            "displayName": "Canada (Central)",
            "name": "ca-central-1"
        }
    ];

    static toQuickPickItemArray(): QuickPickItem[] {
        let items: QuickPickItem[] = [];

        AWSRegions.regions.forEach(region => {
            items.push(new QuickPickItem(region.name, region.displayName))
        });
        return items;
    }
}

