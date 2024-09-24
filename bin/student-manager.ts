#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdkStack';

const app = new cdk.App();

const env = app.node.tryGetContext('env') || 'staging';

const account = process.env.AWS_ACCOUNT_ID;
const region = process.env.AWS_REGION;

if (!account || !region) {
  throw new Error('AWS_ACCOUNT_ID and AWS_REGION must be defined in the .env file');
}

new CdkStack(app, `StudentManager${env.charAt(0).toUpperCase() + env.slice(1)}Stack`, {
  env: { account, region },
});