import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

const lambdaRuntime = lambda.Runtime.NODEJS_20_X;

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Email Verification Lambda
    const emailVerificationLambda = new lambda.Function(this, 'EmailVerificationHandler', {
      runtime: lambdaRuntime,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'emailVerification.handler',
    });

    // User Registration Lambda
    const userRegistrationLambda = new lambda.Function(this, 'UserRegistrationHandler', {
      runtime: lambdaRuntime,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'userRegistration.handler',
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'UserRegistrationAPI', {
      restApiName: 'User Registration Service',
      description: 'This service handles user registration and email verification.',
    });

    // Email Verification Endpoint
    const emailVerificationIntegration = new apigateway.LambdaIntegration(emailVerificationLambda);
    api.root.addResource('verify-email').addMethod('POST', emailVerificationIntegration);

    // User Registration Endpoint
    const userRegistrationIntegration = new apigateway.LambdaIntegration(userRegistrationLambda);
    api.root.addResource('register').addMethod('POST', userRegistrationIntegration);
  }
}