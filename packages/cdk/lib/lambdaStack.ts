import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import sesConfig from '../lib/import/ses';
import { default as apigatewayProperties } from '../lib/import/apigateway';
import { default as vpcImport } from '../lib/import/vpc';
import cognitoProperties from '../lib/import/cognito';

const nodeVersion = {
  lambaRuntime: lambda.Runtime.NODEJS_20_X,
  runtime: 'nodejs20.x',
};

interface LambdaStackProps extends cdk.StackProps {
  redisEndpoint: string;
  redisPort: string;
}

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    // External services properties
    const env = this.node.tryGetContext('env') === 'production' ? 'production' : 'staging';
    const cognitoEnvProperties = cognitoProperties[env];
    const apigatewayEnvProperties = apigatewayProperties[env];

    // =================================================================
    // Email Verification Lambda
    //
    const vpc = ec2.Vpc.fromLookup(this, vpcImport.vpcName, {
      vpcId: vpcImport.vpcId,
    });
    const emailVerificationLambda = new lambda.Function(this, 'EmailVerificationHandler', {
      runtime: nodeVersion.lambaRuntime,
      code: lambda.Code.fromAsset('dist/lambda'),
      handler: 'emailVerification.handler',
      vpc,
      environment: {
        REDIS_ENDPOINT: props.redisEndpoint,
        REDIS_PORT: props.redisPort,
      },
    });
    // Add IAM policy to allow Lambda to send emails using SES
    emailVerificationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendTemplatedEmail', 'ses:SendRawEmail'],
        resources: [sesConfig.sesIdentityArn],
      }),
    );

    // =================================================================
    // User Registration Lambda
    //
    const userRegistrationLambda = new lambda.Function(this, 'UserRegistrationHandler', {
      runtime: nodeVersion.lambaRuntime,
      code: lambda.Code.fromAsset('dist/lambda'),
      handler: 'userRegistration.handler',
      vpc,
      environment: {
        REDIS_ENDPOINT: props.redisEndpoint,
        REDIS_PORT: props.redisPort,
        COGNITO_USER_POOL_ID: cognitoEnvProperties.userPoolId,
      },
    });
    // Add IAM policy to allow Lambda to manage Cognito users
    userRegistrationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminCreateUser', 'cognito-idp:AdminDisableUser', 'cognito-idp:AdminDeleteUser'],
        resources: [cognitoEnvProperties.userPoolArn],
      }),
    );

    // =================================================================
    // API Gateway Endpoints
    //
    const api = apigateway.RestApi.fromRestApiAttributes(this, 'ImportedApi', {
      restApiId: apigatewayEnvProperties.restApiId,
      rootResourceId: apigatewayEnvProperties.rootResourceId,
    });
    const studentResource = api.root.addResource('student');

    // Email Verification Endpoint
    // path: /student/verify-email
    const emailVerificationIntegration = new apigateway.LambdaIntegration(emailVerificationLambda);
    studentResource.addResource('verify-email').addMethod('POST', emailVerificationIntegration);

    // User Registration Endpoint
    // path: /student/register
    const userRegistrationIntegration = new apigateway.LambdaIntegration(userRegistrationLambda);
    studentResource.addResource('register').addMethod('POST', userRegistrationIntegration);
  }
}
