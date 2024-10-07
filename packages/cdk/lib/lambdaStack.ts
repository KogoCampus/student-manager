import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Duration } from 'aws-cdk-lib';
import { SecurityGroupStack } from './securitygroupStack';

import awsImport from '../secrets/awsImport.decrypted.json';

const nodeVersion = {
  lambaRuntime: lambda.Runtime.NODEJS_20_X,
  runtime: 'nodejs20.x',
};

interface LambdaStackProps extends cdk.StackProps {
  redisEndpoint: string;
  redisPort: string;
  securityGroupStack: SecurityGroupStack;
}

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const api = apigateway.RestApi.fromRestApiAttributes(this, 'ImportedApi', {
      restApiId: awsImport.apigateway.restApiId,
      rootResourceId: awsImport.apigateway.rootResourceId,
    });
    const studentResource = api.root.addResource('student');

    // =================================================================
    // Environment Variables
    // =================================================================
    const elasticCacheEnv = {
      REDIS_ENDPOINT: props.redisEndpoint,
      REDIS_PORT: props.redisPort,
    };
    const cognitoEnv = {
      COGNITO_USER_POOL_ID: awsImport.cognito.userPoolId,
      COGNITO_CLIENT_ID: awsImport.cognito.clientId,
    };

    const vpc = ec2.Vpc.fromLookup(this, awsImport.vpc.vpcName, {
      vpcId: awsImport.vpc.vpcId,
    });

    const publicSubnets = [
      awsImport.vpc.subnets.public.usWest2a,
      awsImport.vpc.subnets.public.usWest2b,
      awsImport.vpc.subnets.public.usWest2c,
    ];

    const defaultLambdaProps = {
      runtime: nodeVersion.lambaRuntime,
      timeout: Duration.seconds(15),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
        subnets: publicSubnets.map(subnetId => ec2.Subnet.fromSubnetId(this, `PublicSubnet${subnetId}`, subnetId)),
      },
      securityGroups: [props.securityGroupStack.lambdaSecurityGroup], // Use Lambda security group
    };

    // =================================================================
    // Email Verification Lambda
    // =================================================================
    const emailVerificationLambda = new lambda.Function(this, 'EmailVerificationHandler', {
      ...defaultLambdaProps,
      code: lambda.Code.fromAsset('dist/lambda'),
      handler: 'emailVerification.handler',
      environment: {
        ...elasticCacheEnv,
      },
    });

    // Add IAM policy to allow Lambda to send emails using SES
    emailVerificationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendTemplatedEmail', 'ses:SendRawEmail'],
        resources: [awsImport.ses.sesIdentityArn],
      }),
    );

    // path: /student/verify-email
    const emailVerificationIntegration = new apigateway.LambdaIntegration(emailVerificationLambda);
    studentResource.addResource('verify-email').addMethod('POST', emailVerificationIntegration);

    // =================================================================
    // Resend Verification Lambda
    // =================================================================
    const resendVerificationLambda = new lambda.Function(this, 'ResendVerificationHandler', {
      ...defaultLambdaProps,
      code: lambda.Code.fromAsset('dist/lambda'),
      handler: 'resendVerification.handler',
      environment: {
        ...elasticCacheEnv,
      },
    });

    // Add IAM policy to allow Lambda to send emails using SES
    resendVerificationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendTemplatedEmail', 'ses:SendRawEmail'],
        resources: [awsImport.ses.sesIdentityArn],
      }),
    );

    // path: /student/resend-verification
    const resendVerificationIntegration = new apigateway.LambdaIntegration(resendVerificationLambda);
    studentResource.addResource('resend-verification').addMethod('POST', resendVerificationIntegration);

    // =================================================================
    // User Registration Lambda
    // =================================================================
    const userRegistrationLambda = new lambda.Function(this, 'UserRegistrationHandler', {
      ...defaultLambdaProps,
      code: lambda.Code.fromAsset('dist/lambda'),
      handler: 'userRegistration.handler',
      environment: {
        ...elasticCacheEnv,
        ...cognitoEnv,
      },
    });

    // Add IAM policy to allow Lambda to manage Cognito users
    userRegistrationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminCreateUser', 'cognito-idp:AdminDisableUser', 'cognito-idp:AdminDeleteUser'],
        resources: [awsImport.cognito.userPoolArn],
      }),
    );

    // path: /student/register
    const userRegistrationIntegration = new apigateway.LambdaIntegration(userRegistrationLambda);
    studentResource.addResource('register').addMethod('POST', userRegistrationIntegration);

    // =================================================================
    // Sign In Lambda
    // =================================================================
    const signInLambda = new lambda.Function(this, 'SignInHandler', {
      ...defaultLambdaProps,
      code: lambda.Code.fromAsset('dist/lambda'),
      handler: 'signIn.handler',
      environment: {
        ...cognitoEnv,
      },
    });
    signInLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminInitiateAuth', 'cognito-idp:AdminRespondToAuthChallenge'],
        resources: [awsImport.cognito.userPoolArn],
      }),
    );

    // path: /student/signin
    const signInIntegration = new apigateway.LambdaIntegration(signInLambda);
    studentResource.addResource('signin').addMethod('POST', signInIntegration);

    // =================================================================
    // Password Reset Lambda
    // =================================================================
    const passwordResetLambda = new lambda.Function(this, 'PasswordResetHandler', {
      ...defaultLambdaProps,
      code: lambda.Code.fromAsset('dist/lambda'),
      handler: 'passwordReset.handler',
      environment: {
        ...elasticCacheEnv,
        ...cognitoEnv,
      },
    });

    // Add IAM policy to allow Lambda to manage Cognito users
    passwordResetLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminSetUserPassword', 'cognito-idp:ListUsers'],
        resources: [awsImport.cognito.userPoolArn],
      }),
    );

    // path: /student/password-reset
    const passwordResetIntegration = new apigateway.LambdaIntegration(passwordResetLambda);
    studentResource.addResource('password-reset').addMethod('POST', passwordResetIntegration);

    // =================================================================
    // Authenticate User Lambda
    // =================================================================
    const authenticateUserLambda = new lambda.Function(this, 'AuthenticateUserHandler', {
      ...defaultLambdaProps,
      code: lambda.Code.fromAsset('dist/lambda'),
      handler: 'authenticateUser.handler',
      environment: {
        ...cognitoEnv,
      },
    });
    authenticateUserLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:GetUser'],
        resources: [awsImport.cognito.userPoolArn],
      }),
    );

    // path: /student/authenticate
    const authenticateUserIntegration = new apigateway.LambdaIntegration(authenticateUserLambda);
    studentResource.addResource('authenticate').addMethod('POST', authenticateUserIntegration);
  }
}
