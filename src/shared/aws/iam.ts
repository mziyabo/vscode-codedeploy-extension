import { QuickPickItem } from '../ui/input';
import { AWSClient, Service } from './awsclient';

/**
 * Wraps AWS IAM Client
 */
export class IAMUtil {

    /**
     * Retrieve CodeDeploy Service Role
     */
    async listServiceRoles() {
        const response = await AWSClient.executeAsync(Service.IAM, "listRoles", {});
        return response;
    }

    async getRolesAsQuickPickItems(): Promise<QuickPickItem[]> {

        const listRoleResponse = await this.listServiceRoles();
        const roles: QuickPickItem[] = [];

        if (listRoleResponse.Roles) {
            listRoleResponse.Roles.forEach((role) => {
                roles.push(
                    new QuickPickItem({
                        label: role.Arn,
                        description: role.Description
                    }));
            });
        }

        return roles;
    }
}
