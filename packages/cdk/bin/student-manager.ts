#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LambdaStack } from '../lib/lambdaStack';
import { ElasticCacheStack } from '../lib/elasticacheStack';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

const app = new cdk.App();

const env = app.node.tryGetContext('env') || 'staging';
const stackName = (service: string) => `StudentManager${service}${env.charAt(0).toUpperCase() + env.slice(1)}Stack`;

// Fetch AWS Account ID and Region from the current AWS profile
async function getAccountIdAndRegion() {
  const stsClient = new STSClient({});
  const command = new GetCallerIdentityCommand({});
  const response = await stsClient.send(command);

  const accountId = response.Account;
  const region = 'us-west-2';

  if (!accountId || !region) {
    throw new Error('Failed to retrieve AWS account ID or region');
  }

  return { accountId, region };
}

(async () => {
  const { accountId, region } = await getAccountIdAndRegion();

  // Deploy ElastiCache Redis Stack
  const redisStack = new ElasticCacheStack(app, stackName('ElasticCache'), {
    env: { account: accountId, region },
  });

  // Deploy Lambda Stack
  const lambdaStack = new LambdaStack(app, stackName('Lambda'), {
    env: { account: accountId, region },
    redisEndpoint: redisStack.redisEndpoint,
    redisPort: redisStack.redisPort,
  });
  lambdaStack.addDependency(redisStack);
})();
