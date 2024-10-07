import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Duration } from 'aws-cdk-lib';

import awsImport from '../secrets/awsImport.decrypted.json';

const nodeVersion = {
  lambaRuntime: lambda.Runtime.NODEJS_20_X,
  runtime: 'nodejs20.x',
};

interface LambdaStackProps extends cdk.StackProps {
  redisEndpoint: string;
  redisPort: string;
  securityGroup: cdk.aws_ec2.SecurityGroup;
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

    const subnets = [
      awsImport.vpc.subnets.private.usWest2a,
      awsImport.vpc.subnets.private.usWest2b,
      awsImport.vpc.subnets.private.usWest2c,
    ];

    const defaultLambdaProps = {
      runtime: nodeVersion.lambaRuntime,
      timeout: Duration.seconds(15),
      vpc,
      vpcSubnets: {
        subnets: subnets.map(subnetId => ec2.Subnet.fromSubnetId(this, `PublicSubnet${subnetId}`, subnetId)),
      },
      securityGroups: [props.securityGroup], // Use Lambda security group
    };

    // =================================================================
    // CloudWatch Logs Policy for all Lambdas
    // =================================================================
    const cloudWatchLogsPolicy = new iam.PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: ['*'],
    });

    const addCloudWatchLogsPolicy = (lambdaFunction: lambda.Function) => {
      lambdaFunction.addToRolePolicy(cloudWatchLogsPolicy);
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

    // Add IAM policy
    emailVerificationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendTemplatedEmail', 'ses:SendRawEmail'],
        resources: [awsImport.ses.sesIdentityArn, awsImport.ses.sesConfigurationSetArn],
      }),
    );
    addCloudWatchLogsPolicy(emailVerificationLambda);

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

    // Add IAM policy
    resendVerificationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendTemplatedEmail', 'ses:SendRawEmail'],
        resources: [awsImport.ses.sesIdentityArn, awsImport.ses.sesConfigurationSetArn],
      }),
    );
    addCloudWatchLogsPolicy(resendVerificationLambda);

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

    // Add IAM policy
    userRegistrationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminCreateUser', 'cognito-idp:AdminDisableUser', 'cognito-idp:AdminDeleteUser'],
        resources: [awsImport.cognito.userPoolArn],
      }),
    );
    addCloudWatchLogsPolicy(userRegistrationLambda);

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

    // Add IAM policy
    signInLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminInitiateAuth', 'cognito-idp:AdminRespondToAuthChallenge'],
        resources: [awsImport.cognito.userPoolArn],
      }),
    );
    addCloudWatchLogsPolicy(signInLambda);

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

    // Add IAM policy
    passwordResetLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:AdminSetUserPassword', 'cognito-idp:ListUsers'],
        resources: [awsImport.cognito.userPoolArn],
      }),
    );
    addCloudWatchLogsPolicy(passwordResetLambda);

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

    // Add IAM policy
    authenticateUserLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:GetUser'],
        resources: [awsImport.cognito.userPoolArn],
      }),
    );
    addCloudWatchLogsPolicy(authenticateUserLambda);

    // path: /student/authenticate
    const authenticateUserIntegration = new apigateway.LambdaIntegration(authenticateUserLambda);
    studentResource.addResource('authenticate').addMethod('POST', authenticateUserIntegration);
  }
}
