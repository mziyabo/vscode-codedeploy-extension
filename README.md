# vscode AWS CodeDeploy Extension
[![Marketplace Version](https://img.shields.io/vscode-marketplace/v/mziyabo.vscode-codedeploy.svg) ![Marketplace Downloads](https://img.shields.io/vscode-marketplace/d/mziyabo.vscode-codedeploy.svg)](https://marketplace.visualstudio.com/items?itemName=mziyabo.vscode-codedeploy) 

vscode [AWS CodeDeploy](https://docs.aws.amazon.com/codedeploy/latest/userguide/welcome.html) extension for deploying to EC2.

## Features
- Link AWS CodeDeploy Application to vscode workspace and view/manage application.

![view](./resources/marketplace/explorer.PNG)

- Create CodeDeploy Application and/ Deployment Groups.
- Deploy to CodeDeploy from a vscode working folder or project using S3 revision locations.

## Installation
1. Install aws-cli and [configure credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html). Alternatively setup AWS Credentials from [Environment Variables](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html)
2. Install [AWS CodeDeploy]() extension in vscode

## Quick Start

To get setup with the extension perform the following tasks:
1. Open vscode Explorer in the Activity Bar.
2. Click either `Create Application` or `Add Exisitng Application` to link application with workspace.
3. Follow the on-screen prompts to add Application and Deployment Group.

Click `Add AutoScaling Group` or `Add EC2 Tag Filter` to associate application with EC2 Targets

![Add Targets](./resources/marketplace/addtargets.PNG)

4. Right click a deployment group and choose `Deploy Application` to create deployment to targets from the vscode workspace.

## Extension Limitations
- Limited to CodeDeploy to EC2, i.e. Support for Lambda and ECS not yet available
- Supports S3 revision locations- GitHub currently not available 

## Release Notes
This extension is still in preview.

## Licence
[Apache 2.0 License](./LICENSE)