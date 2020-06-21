## 0.5.3 (2020-06-21)
- __Optimization__: Scoped out unused AWS Clients - reducing package size from 4.5mb to 600kb
- __Bug Fix__: Added activationEvents for Command Palette commands
- __Improvement__: Added InProgress deployment tracking to status bar
- __Improvement__: Added Inline treeview icons (createDeployment,)
- __Improvement__: Multistep now includes steps/totalsteps for longer Dialogs
- __Improvement__: Added description to Succeeding Deployments
- __Feature__: Added ELB and DeploymentGroup Info
- __Feature__: Set MaximumDeployments to display in tree via Configuration
- __Feature__: Multistep process/Dialog can now evaluate responses on each step

Other:
- __Refactor__: broke out AWS Clients and workspace Config
- __Refactor__: broke out commands into own sub-directory/files
- __Refactor__: TreeItemUtil usability improvements*

## 0.5.2 (2020-04-07)
- Updates to older npm dependencies
- __Bug Fix__: Updated icons for Skipped deployent targets

## 0.5.1 (2019-12-08)
- __Refactor__: Updated project structure- Decoupled treedataprovider and commands.
- __Improvement__: Reduced installation footprint via webpack - Improving the time it takes to activate extension.

## 0.5.0 (2019-11-23 initial release)
- __Bug Fixes__:
    - Fixed errors from updating application configuration outside workspace.
    - Fixed broken DeploymentGroups URL in `Open AWS Console` command.