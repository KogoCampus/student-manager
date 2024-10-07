# Student Manager
Student Manager is a combination of mono-projects to provide infrastructure code (CDK), lambda API handlers, and an Admin UI for managing student authentication, accounts, push notifications, 

### Project Structure
```
packages/cdk --- Infrastructure code managed using AWS CDK, which deploys Lambda functions, API Gateway, and other AWS services.
packages/ui --- Admin UI for managing users, sending manual push notifications, and other administrative tasks.
lib/* --- Shared libraries used across different packages, including utility functions, services, and more.
```

## Getting Started
1. Add `.npmrc` in the project root to install depedencies from our private npm registry:  
```
@KogoCampus:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=your-github-token
```
Please refer [this](https://docs.catalyst.zoho.com/en/tutorials/githubbot/java/generate-personal-access-token/) to find how to obtain the personal github token.  

2. Install AWS SAM CLI  
https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html  

3. Decrypt secrets
```
pnpm decrypt
```
> You should have installed AWS CLI and configured your local AWS profile.

4. Run development instances

This will start all development environment instances across packages (including CDK, UI, and others)
```
pnpm dev
```

If you only want to work with CDK and the backend API (without running the UI), then navigate to the CDK and run the command.  
```
cd packages/cdk
pnpm dev
```


## CDK Development
CDK is a key part of the Student Manager project, defining and deploying the AWS infrastructure. Below is an overview of the main components and how to add new Lambda handlers.
```
bin/student-manager.ts --- CDK entry point that governs the release of stacks.

lib/*Stack.ts --- Stack files that define and create each service in Student Manager.

lib/imports/* --- Contains properties for existing AWS services (not the ones Student Manager creates). 

src/lambda/* --- Lambda handlers.

src/lambda/*.yaml --- Lambda handlers' associated OpenAPI and SAM resource definitions.

test/* --- Unit test files for each Lambda handler.

serverless.yaml --- Base configuration file for AWS SAM, used for local testing of Lambda handlers.
```


### Creating a Lambda Handler
To add a new Lambda handler to the Student Manager, follow these steps:
- Add your Lambda handler in src/lambda.
- Register the Lambda Handler via the CDK Stack.

To deploy your Lambda handler to the remote environment, append the handler configuration to `lib/lambdaStack.ts`. 

If the handler requires additional AWS resources, create a stack for those resources in the `lib/` directory.

If you're using an existing AWS resource, add the necessary properties in `lib/import`.

- Write the Lambda Handlers' Open API and SAM definition in handler_name.yml  

- Add Unit Tests

Create unit tests for your Lambda handler in the `test/lambda/` directory.

- Deploy via GHA workflow, or locally by `pnpm deploy`

> Note that deploying a new lambda handler won't be immediately affected to the API dns. You have to navigate to AWS API Gateway console and press "Deploy API" to the `staging` stage.  
