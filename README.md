# Student Manager
Student Manager is a Nx monorepo project that provides infrastructure (CDK) and an Admin UI for managing student accounts, sending manual push notifications, 

### Project Structure
```
packages/cdk --- Infrastructure code managed using AWS CDK, which deploys Lambda functions, API Gateway, and other AWS services.
packages/ui --- Admin UI for managing users, sending manual push notifications, and other administrative tasks.
lib/* --- Shared libraries used across different packages, including utility functions, services, and more.
```

## Getting Started
Install AWS SAM CLI  
https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html  

To turn on all development environment instances across packages (including CDK, UI, and others), you can run:
```
yarn dev
```

If you only want to work with CDK and the backend API (without running the UI), follow these steps:

- Navigate to the CDK package:
```
cd packages/cdk
```
Run the development environment for CDK:
```
yarn dev
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
- Register the Lambda Handler in the CDK.

To deploy your Lambda handler to the remote environment, add it to `lib/lambdaStack.ts`. 

If the handler requires additional AWS resources, create a stack for those resources in the `lib/` directory.

If you're using an existing AWS resource, add the necessary properties in `lib/import`.

- Add the Lambda Handlers' Open API and SAM definitions to their corresponding yaml files.

In order to simulate the Lambda handler locally for testing with AWS SAM, register your handler in serverless.yaml. 

This ensures that AWS SAM can create a local Lambda instance for you to test the function before deploying it.

- Add Unit Tests

Create unit tests for your Lambda handler in the `test/lambda/` directory.

### Running Lambda Handlers Locally
If you want to test your Lambda handlers with real HTTP calls in a local environment, you can use AWS SAM to simulate the AWS environment.
```
yarn dev
```
This will invoke the AWS SAM instance along with all required dependencies, allowing you to make real HTTP calls to your Lambda functions locally.

