import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';

import awsImport from '../secrets/awsImport.decrypted.json';

interface ElasticCacheStackProps extends cdk.StackProps {
  securityGroup: cdk.aws_ec2.SecurityGroup;
}

export class ElasticCacheStack extends cdk.Stack {
  public readonly redisEndpoint: string;
  public readonly redisPort: string;
  public readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props: ElasticCacheStackProps) {
    super(scope, id, props);

    // Import the existing VPC
    this.vpc = ec2.Vpc.fromLookup(this, 'KogoVpc', {
      vpcId: awsImport.vpc.vpcId,
    });

    // Use the private subnets from vpc.ts
    const redisSubnets = [
      awsImport.vpc.subnets.private.usWest2a,
      awsImport.vpc.subnets.private.usWest2b,
      awsImport.vpc.subnets.private.usWest2c,
    ];

    // Create a subnet group for the Redis cluster
    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis cache in private subnets',
      subnetIds: redisSubnets,
    });

    // Create a Redis cluster
    const redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      engine: 'redis',
      cacheNodeType: 'cache.t3.micro', // Small serverless instance
      numCacheNodes: 1,
      vpcSecurityGroupIds: [props.securityGroup.securityGroupId],
      cacheSubnetGroupName: subnetGroup.ref,
    });

    // Export the Redis endpoint and port for use in the Lambda stack
    this.redisEndpoint = redisCluster.attrRedisEndpointAddress;
    this.redisPort = redisCluster.attrRedisEndpointPort;
  }
}
