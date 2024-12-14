# Student Manager

AWS CDK project for user authentication system using AWS Cognito and ElastiCache.

## Prerequisites

- [SOPS](https://github.com/mozilla/sops#install) installed locally
- AWS CLI configured with Kogo AWS account
- Node.js and pnpm

## Setup & Development

```bash
# Install dependencies
pnpm install

# Decrypt secrets and bundle CDK files
pnpm dev

# Run tests
pnpm test

# Deploy
pnpm cdk:bootstrap
pnpm cdk:deploy
```

## Adding New Handlers

1. Create OpenAPI spec file in `cdk/src/docs` directory
2. Add the Lambda function to `cdk/lib/lambdaStack.ts`:
   ```typescript
   const newHandlerLambda = new NodejsFunction(this, 'NewHandlerName', {
     ...nodeJsFunctionProps,
     entry: path.join(__dirname, '../src/lambda/handlers/newHandler.ts'),
     bundling,
   });
   // Add required IAM policies
   newHandlerLambda.addToRolePolicy(policies.cognito.userManagement);
   
   // Add API Gateway integration
   const newHandlerIntegration = new apigateway.LambdaIntegration(newHandlerLambda);
   studentResource.addResource('new-endpoint').addMethod('POST', newHandlerIntegration);
   ```
3. Deploy changes in AWS API Gateway console manually

## Managing Settings

Decrypt settings:
```bash
sops --config=./config/sops.yaml -d -i ./config/settings.staging.json
sops --config=./config/sops.yaml -d -i ./config/settings.production.json
```

Encrypt settings:
```bash
sops --config=./config/sops.yaml -e -i ./config/settings.staging.json
sops --config=./config/sops.yaml -e -i ./config/settings.production.json
```

## Commit Convention

Use conventional commits with these types:
```bash
feat     # New features
fix      # Bug fixes
docs     # Documentation changes
style    # Code style changes (formatting, etc)
refactor # Code refactoring
ci       # CI/CD changes
test     # Adding/updating tests
foo      # Minor changes
```

Example:
```bash
git commit -m "feat: add registration handler"
```

## Notes

- No local test environment available
- All testing must be done in remote environment
- New endpoints require manual API Gateway deployment
