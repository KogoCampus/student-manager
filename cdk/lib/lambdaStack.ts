import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { settings } from '../src/settings';
import * as path from 'path';

// Unified IAM policies
const policies = {
  ses: {
    sendEmail: new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendTemplatedEmail', 'ses:SendRawEmail'],
      resources: [settings.ses.sesIdentityArn, settings.ses.sesConfigurationSetArn],
    }),
  },
  cognito: {
    getUser: new iam.PolicyStatement({
      actions: ['cognito-idp:GetUser'],
      resources: [settings.cognito.userPoolArn],
    }),
    userManagement: new iam.PolicyStatement({
      actions: [
        'cognito-idp:AdminSetUserPassword',
        'cognito-idp:AdminInitiateAuth',
        'cognito-idp:AdminCreateUser',
        'cognito-idp:ListUsers',
      ],
      resources: [settings.cognito.userPoolArn],
    }),
    auth: new iam.PolicyStatement({
      actions: ['cognito-idp:AdminInitiateAuth', 'cognito-idp:AdminRespondToAuthChallenge'],
      resources: [settings.cognito.userPoolArn],
    }),
    passwordReset: new iam.PolicyStatement({
      actions: ['cognito-idp:AdminSetUserPassword', 'cognito-idp:ListUsers'],
      resources: [settings.cognito.userPoolArn],
    }),
  },
};

interface LambdaStackProps extends cdk.StackProps {
  redisEndpoint: string;
  redisPort: string;
  securityGroup: cdk.aws_ec2.SecurityGroup;
}

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, settings.vpc.vpcName, {
      vpcId: settings.vpc.vpcId,
    });

    const api = apigateway.RestApi.fromRestApiAttributes(this, 'ImportedApi', {
      restApiId: settings.apigateway.restApiId,
      rootResourceId: settings.apigateway.rootResourceId,
    });
    const studentResource = api.root.addResource('student');

    // Common environment variables for all Lambda functions
    const environment = {
      NODE_OPTIONS: '--enable-source-maps',
      REDIS_ENDPOINT: props.redisEndpoint,
      REDIS_PORT: props.redisPort,
      SENTRY_DSN: settings.sentry.dsn,
    };

    // Initialize Sentry Layer
    const sentryLayerArn = 'arn:aws:lambda:us-west-2:943013980633:layer:SentryNodeServerlessSDK:281';
    const sentryLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'SentryLayer', sentryLayerArn);

    // Common NodeJS function options
    const nodeJsFunctionProps: Partial<lambda.FunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(15),
      vpc,
      environment,
      securityGroups: [props.securityGroup],
      layers: [sentryLayer], // Add Sentry layer to all functions
    };

    // Common bundling options for esbuild
    const bundling = {
      minify: true,
      sourceMap: true,
      target: 'node20',
      keepNames: true, // Helps with stack traces
    };

    // =================================================================
    // Email Verification Lambda
    // =================================================================
    const emailVerificationLambda = new NodejsFunction(this, 'EmailVerificationHandler', {
      ...nodeJsFunctionProps,
      entry: path.join(__dirname, '../src/lambda/handlers/emailVerification.ts'),
      bundling,
    });
    emailVerificationLambda.addToRolePolicy(policies.ses.sendEmail);
    emailVerificationLambda.addToRolePolicy(policies.cognito.userManagement);

    // path: /student/verify-email
    const emailVerificationIntegration = new apigateway.LambdaIntegration(emailVerificationLambda);
    const verifyEmailResource = studentResource.addResource('verify-email');
    verifyEmailResource.addMethod('POST', emailVerificationIntegration);

    // =================================================================
    // Verify Email For Password Lambda
    // =================================================================
    const verifyEmailForPasswordLambda = new NodejsFunction(this, 'VerifyEmailForPasswordHandler', {
      ...nodeJsFunctionProps,
      entry: path.join(__dirname, '../src/lambda/handlers/emailVerificationForPassword.ts'),
      bundling,
    });
    verifyEmailForPasswordLambda.addToRolePolicy(policies.ses.sendEmail);
    verifyEmailForPasswordLambda.addToRolePolicy(policies.cognito.userManagement);

    // path: /student/verify-email/password
    const verifyEmailForPasswordIntegration = new apigateway.LambdaIntegration(verifyEmailForPasswordLambda);
    verifyEmailResource.addResource('password').addMethod('POST',  verifyEmailForPasswordIntegration);

    // =================================================================
    // Verify Email Complete Lambda
    // =================================================================
    const verifyEmailCompleteLambda = new NodejsFunction(this, 'VerifyEmailCompleteHandler', {
      ...nodeJsFunctionProps,
      entry: path.join(__dirname, '../src/lambda/handlers/emailVerificationComplete.ts'),
      bundling,
    });

    // path: /student/verify-email/complete
    const verifyEmailCompleteIntegration = new apigateway.LambdaIntegration(verifyEmailCompleteLambda);
    verifyEmailResource.addResource('complete').addMethod('POST', verifyEmailCompleteIntegration);

    // =================================================================
    // Resend Verification Lambda
    // =================================================================
    const resendVerificationLambda = new NodejsFunction(this, 'ResendVerificationHandler', {
      ...nodeJsFunctionProps,
      entry: path.join(__dirname, '../src/lambda/handlers/resendVerification.ts'),
      bundling,
    });
    resendVerificationLambda.addToRolePolicy(policies.ses.sendEmail);

    // path: /student/resend-verification
    const resendVerificationIntegration = new apigateway.LambdaIntegration(resendVerificationLambda);
    studentResource.addResource('resend-verification').addMethod('POST', resendVerificationIntegration);

    // =================================================================
    // User Registration Lambda
    // =================================================================
    const userRegistrationLambda = new NodejsFunction(this, 'UserRegistrationHandler', {
      ...nodeJsFunctionProps,
      entry: path.join(__dirname, '../src/lambda/handlers/userRegistration.ts'),
      bundling,
    });
    userRegistrationLambda.addToRolePolicy(policies.cognito.userManagement);

    // path: /student/register
    const userRegistrationIntegration = new apigateway.LambdaIntegration(userRegistrationLambda);
    studentResource.addResource('register').addMethod('POST', userRegistrationIntegration);

    // =================================================================
    // Sign In Lambda
    // =================================================================
    const signInLambda = new NodejsFunction(this, 'SignInHandler', {
      ...nodeJsFunctionProps,
      entry: path.join(__dirname, '../src/lambda/handlers/signIn.ts'),
      bundling,
    });
    signInLambda.addToRolePolicy(policies.cognito.auth);

    // path: /student/signin
    const signInIntegration = new apigateway.LambdaIntegration(signInLambda);
    studentResource.addResource('signin').addMethod('POST', signInIntegration);

    // =================================================================
    // Password Reset Lambda
    // =================================================================
    const passwordResetLambda = new NodejsFunction(this, 'PasswordResetHandler', {
      ...nodeJsFunctionProps,
      entry: path.join(__dirname, '../src/lambda/handlers/passwordReset.ts'),
      bundling,
    });
    passwordResetLambda.addToRolePolicy(policies.cognito.passwordReset);

    // path: /student/password-reset
    const passwordResetIntegration = new apigateway.LambdaIntegration(passwordResetLambda);
    studentResource.addResource('password-reset').addMethod('POST', passwordResetIntegration);

    // =================================================================
    // Authenticate User Lambda
    // =================================================================
    const authenticateUserLambda = new NodejsFunction(this, 'AuthenticateUserHandler', {
      ...nodeJsFunctionProps,
      entry: path.join(__dirname, '../src/lambda/handlers/authenticateUser.ts'),
      bundling,
    });
    authenticateUserLambda.addToRolePolicy(policies.cognito.getUser);

    // path: /student/authenticate
    const authenticateUserIntegration = new apigateway.LambdaIntegration(authenticateUserLambda);
    studentResource.addResource('authenticate').addMethod('GET', authenticateUserIntegration);

    // =================================================================
    // Send Report Lambda
    // =================================================================
    const sendReportLambda = new NodejsFunction(this, 'SendReportHandler', {
      ...nodeJsFunctionProps,
      entry: path.join(__dirname, '../src/lambda/handlers/sendReport.ts'),
      bundling,
    });
    sendReportLambda.addToRolePolicy(policies.ses.sendEmail);

    const sendReportIntegration = new apigateway.LambdaIntegration(sendReportLambda);
    studentResource.addResource('send-report').addMethod('POST', sendReportIntegration);

    // =================================================================
    // Get Schools Lambda
    // =================================================================
    const getSchoolsLambda = new NodejsFunction(this, 'GetSchoolsHandler', {
      ...nodeJsFunctionProps,
      entry: path.join(__dirname, '../src/lambda/handlers/getSchools.ts'),
      bundling,
    });

    // path: /student/schools
    const getSchoolsIntegration = new apigateway.LambdaIntegration(getSchoolsLambda);
    studentResource.addResource('schools').addMethod('GET', getSchoolsIntegration);
  }
}
