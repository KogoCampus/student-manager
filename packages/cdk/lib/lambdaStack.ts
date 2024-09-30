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

    const env = this.node.tryGetContext('env') === 'production' ? 'production' : 'staging';
    const cognitoEnvProperties = cognitoProperties[env];
    const apigatewayEnvProperties = apigatewayProperties[env];

    const api = apigateway.RestApi.fromRestApiAttributes(this, 'ImportedApi', {
      restApiId: apigatewayEnvProperties.restApiId,
      rootResourceId: apigatewayEnvProperties.rootResourceId,
    });
    const studentResource = api.root.addResource('student');

    // =================================================================
    // Email Verification Lambda
    // =================================================================
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

    // path: /student/verify-email
    const emailVerificationIntegration = new apigateway.LambdaIntegration(emailVerificationLambda);
    studentResource.addResource('verify-email').addMethod('POST', emailVerificationIntegration);

    // =================================================================
    // Resend Verification Lambda
    // =================================================================
    const resendVerificationLambda = new lambda.Function(this, 'ResendVerificationHandler', {
      runtime: nodeVersion.lambaRuntime,
      code: lambda.Code.fromAsset('dist/lambda'),
      handler: 'resendVerification.handler',
      vpc,
      environment: {
        REDIS_ENDPOINT: props.redisEndpoint,
        REDIS_PORT: props.redisPort,
      },
    });

    // Add IAM policy to allow Lambda to send emails using SES
    resendVerificationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendTemplatedEmail', 'ses:SendRawEmail'],
        resources: [sesConfig.sesIdentityArn],
      }),
    );

    // path: /student/resend-verification
    const resendVerificationIntegration = new apigateway.LambdaIntegration(resendVerificationLambda);
    studentResource.addResource('resend-verification').addMethod('POST', resendVerificationIntegration);

    // =================================================================
    // User Registration Lambda
    // =================================================================
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

    // path: /student/register
    const userRegistrationIntegration = new apigateway.LambdaIntegration(userRegistrationLambda);
    studentResource.addResource('register').addMethod('POST', userRegistrationIntegration);

    // =================================================================
    // Sign In Lambda
    // =================================================================
    const signInLambda = new lambda.Function(this, 'SignInHandler', {
      runtime: nodeVersion.lambaRuntime,
      code: lambda.Code.fromAsset('dist/lambda'),
      handler: 'signIn.handler',
      vpc,
      environment: {
        COGNITO_USER_POOL_ID: cognitoEnvProperties.userPoolId,
        COGNITO_CLIENT_ID: cognitoEnvProperties.clientId,
      },
    });
    signInLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminInitiateAuth', 'cognito-idp:AdminRespondToAuthChallenge'],
        resources: [cognitoEnvProperties.userPoolArn],
      }),
    );

    // path: /student/signin
    const signInIntegration = new apigateway.LambdaIntegration(signInLambda);
    studentResource.addResource('signin').addMethod('POST', signInIntegration);

    // =================================================================
    // Password Reset Lambda
    // =================================================================
    const passwordResetLambda = new lambda.Function(this, 'PasswordResetHandler', {
      runtime: nodeVersion.lambaRuntime,
      code: lambda.Code.fromAsset('dist/lambda'),
      handler: 'passwordReset.handler',
      vpc,
      environment: {
        COGNITO_USER_POOL_ID: cognitoEnvProperties.userPoolId,
        REDIS_ENDPOINT: props.redisEndpoint,
        REDIS_PORT: props.redisPort,
      },
    });

    // Add IAM policy to allow Lambda to manage Cognito users
    passwordResetLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminSetUserPassword', 'cognito-idp:ListUsers'],
        resources: [cognitoEnvProperties.userPoolArn],
      }),
    );

    // path: /student/password-reset
    const passwordResetIntegration = new apigateway.LambdaIntegration(passwordResetLambda);
    studentResource.addResource('password-reset').addMethod('POST', passwordResetIntegration);

    // =================================================================
    // Authenticate User Lambda
    // =================================================================
    const authenticateUserLambda = new lambda.Function(this, 'AuthenticateUserHandler', {
      runtime: nodeVersion.lambaRuntime,
      code: lambda.Code.fromAsset('dist/lambda'),
      handler: 'authenticateUser.handler',
      vpc,
      environment: {
        COGNITO_USER_POOL_ID: cognitoEnvProperties.userPoolId,
      },
    });
    authenticateUserLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:GetUser'],
        resources: [cognitoEnvProperties.userPoolArn],
      }),
    );

    // path: /student/authenticate
    const authenticateUserIntegration = new apigateway.LambdaIntegration(authenticateUserLambda);
    studentResource.addResource('authenticate').addMethod('POST', authenticateUserIntegration);
  }
}
