#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LambdaStack } from '../lib/lambdaStack';
import { ElasticCacheStack } from '../lib/elasticacheStack';
import { SecurityGroupStack } from '../lib/securityGroupStack';
import { settings } from '../src/settings';

const app = new cdk.App();

// Use environment from settings
const env = settings.environment;
const stackName = (service: string) => `StudentManager${service}${env.charAt(0).toUpperCase() + env.slice(1)}Stack`;

// AWS account configuration
const awsEnv = {
  account: '992382730467',
  region: 'us-west-2',
};

const securityGroupStack = new SecurityGroupStack(app, stackName('SecurityGroup'), {
  env: awsEnv,
});

const redisStack = new ElasticCacheStack(app, stackName('ElasticCache'), {
  env: awsEnv,
  securityGroup: securityGroupStack.elasticacheSecurityGroup,
});
redisStack.addDependency(securityGroupStack);

const lambdaStack = new LambdaStack(app, stackName('Lambda'), {
  env: awsEnv,
  redisEndpoint: redisStack.redisEndpoint,
  redisPort: redisStack.redisPort,
  securityGroup: securityGroupStack.lambdaSecurityGroup,
});
lambdaStack.addDependency(securityGroupStack);
lambdaStack.addDependency(redisStack);
