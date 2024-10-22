import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

import awsImport from '../secrets/awsImport.decrypted.json';

interface LambdaStackProps extends cdk.StackProps {
  redisEndpoint: string;
  redisPort: string;
  securityGroup: cdk.aws_ec2.SecurityGroup;
}

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, awsImport.vpc.vpcName, {
      vpcId: awsImport.vpc.vpcId,
    });

    const defaultLambdaConfig = {
      vpc,
      runtime: lambda.Runtime.NODEJS_20_X, // Runtime configuration
      memorySize: 512, // Default memory size (MB)
      timeout: cdk.Duration.seconds(15), // Default timeout (seconds)
    };

    const sentryLayerArn = 'arn:aws:lambda:us-west-2:943013980633:layer:SentryNodeServerlessSDK:281';
    const sentryLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'SentryLayer', sentryLayerArn);

    const api = apigateway.RestApi.fromRestApiAttributes(this, 'ImportedApi', {
      restApiId: awsImport.apigateway.restApiId,
      rootResourceId: awsImport.apigateway.rootResourceId,
    });
    const studentResource = api.root.addResource('student');

    // =================================================================
    // Environment Variables
    // =================================================================
    const defaultEnv = {
      NODE_OPTIONS: '--enable-source-maps',
    };
    const elasticCacheEnv = {
      REDIS_ENDPOINT: props.redisEndpoint,
      REDIS_PORT: props.redisPort,
    };
    const cognitoEnv = {
      COGNITO_USER_POOL_ID: awsImport.cognito.userPoolId,
      COGNITO_CLIENT_ID: awsImport.cognito.clientId,
    };

    // =================================================================
    // Email Verification Lambda
    // =================================================================
    const emailVerificationLambda = new lambda.Function(this, 'EmailVerificationHandler', {
      ...defaultLambdaConfig,
      code: lambda.Code.fromAsset('dist/lambda/emailVerification'),
      handler: 'emailVerification.handler',
      securityGroups: [props.securityGroup],
      environment: {
        ...defaultEnv,
        ...elasticCacheEnv,
      },
      layers: [sentryLayer],
    });

    // Add IAM policy to allow Lambda to send emails using SES
    emailVerificationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendTemplatedEmail', 'ses:SendRawEmail'],
        resources: [awsImport.ses.sesIdentityArn, awsImport.ses.sesConfigurationSetArn],
      }),
    );

    // path: /student/verify-email
    const emailVerificationIntegration = new apigateway.LambdaIntegration(emailVerificationLambda);
    const verifyEmailResource = studentResource.addResource('verify-email');
    verifyEmailResource.addMethod('POST', emailVerificationIntegration);

    // =================================================================
    // Verify Email Complete Lambda
    // =================================================================
    const verifyEmailCompleteLambda = new lambda.Function(this, 'VerifyEmailCompleteHandler', {
      ...defaultLambdaConfig,
      code: lambda.Code.fromAsset('dist/lambda/emailVerificationComplete'),
      handler: 'emailVerificationComplete.handler',
      securityGroups: [props.securityGroup],
      environment: {
        ...defaultEnv,
        ...elasticCacheEnv,
      },
      layers: [sentryLayer],
    });

    // path: /student/verify-email/complete
    const verifyEmailCompleteIntegration = new apigateway.LambdaIntegration(verifyEmailCompleteLambda);
    verifyEmailResource.addResource('complete').addMethod('POST', verifyEmailCompleteIntegration);

    // =================================================================
    // Resend Verification Lambda
    // =================================================================
    const resendVerificationLambda = new lambda.Function(this, 'ResendVerificationHandler', {
      ...defaultLambdaConfig,
      code: lambda.Code.fromAsset('dist/lambda/resendVerification'),
      handler: 'resendVerification.handler',
      securityGroups: [props.securityGroup],
      environment: {
        ...defaultEnv,
        ...elasticCacheEnv,
      },
      layers: [sentryLayer],
    });

    // Add IAM policy to allow Lambda to send emails using SES
    resendVerificationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendTemplatedEmail', 'ses:SendRawEmail'],
        resources: [awsImport.ses.sesIdentityArn, awsImport.ses.sesConfigurationSetArn],
      }),
    );

    // path: /student/resend-verification
    const resendVerificationIntegration = new apigateway.LambdaIntegration(resendVerificationLambda);
    studentResource.addResource('resend-verification').addMethod('POST', resendVerificationIntegration);

    // =================================================================
    // User Registration Lambda
    // =================================================================
    const userRegistrationLambda = new lambda.Function(this, 'UserRegistrationHandler', {
      ...defaultLambdaConfig,
      code: lambda.Code.fromAsset('dist/lambda/userRegistration'),
      handler: 'userRegistration.handler',
      securityGroups: [props.securityGroup],
      environment: {
        ...defaultEnv,
        ...elasticCacheEnv,
        ...cognitoEnv,
      },
      layers: [sentryLayer],
    });

    // Add IAM policy to allow Lambda to manage Cognito users
    userRegistrationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:AdminSetUserPassword',
          'cognito-idp:AdminInitiateAuth',
          'cognito-idp:AdminCreateUser',
          'cognito-idp:ListUsers',
        ],
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
      ...defaultLambdaConfig,
      code: lambda.Code.fromAsset('dist/lambda/signIn'),
      handler: 'signIn.handler',
      securityGroups: [props.securityGroup],
      environment: {
        ...defaultEnv,
        ...cognitoEnv,
      },
      layers: [sentryLayer],
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
      ...defaultLambdaConfig,
      code: lambda.Code.fromAsset('dist/lambda/passwordReset'),
      handler: 'passwordReset.handler',
      securityGroups: [props.securityGroup],
      environment: {
        ...defaultEnv,
        ...elasticCacheEnv,
        ...cognitoEnv,
      },
      layers: [sentryLayer],
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
      ...defaultLambdaConfig,
      code: lambda.Code.fromAsset('dist/lambda/authenticateUser'),
      handler: 'authenticateUser.handler',
      securityGroups: [props.securityGroup],
      environment: {
        ...defaultEnv,
        ...cognitoEnv,
      },
      layers: [sentryLayer],
    });
    authenticateUserLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:GetUser'],
        resources: [awsImport.cognito.userPoolArn],
      }),
    );

    // path: /student/authenticate
    const authenticateUserIntegration = new apigateway.LambdaIntegration(authenticateUserLambda);
    studentResource.addResource('authenticate').addMethod('GET', authenticateUserIntegration);

    // =================================================================
    // Send Report Lambda
    // =================================================================
    const sendReportLambda = new lambda.Function(this, 'SendReportHandler', {
      ...defaultLambdaConfig,
      code: lambda.Code.fromAsset('dist/lambda/sendReport'),
      handler: 'sendReport.handler',
      environment: {
        ...defaultEnv,
        ...elasticCacheEnv,
      },
      layers: [sentryLayer],
    });

    // Add IAM policy for sending emails via SES (if the report sends notifications)
    sendReportLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendTemplatedEmail', 'ses:SendRawEmail'],
        resources: [awsImport.ses.sesIdentityArn, awsImport.ses.sesConfigurationSetArn],
      }),
    );

    const sendReportIntegration = new apigateway.LambdaIntegration(sendReportLambda);
    studentResource.addResource('send-report').addMethod('POST', sendReportIntegration);
  }
}
