import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';

import vpcImport from '../lib/import/vpc.decrypted.json';

type ElasticCacheStackProps = cdk.StackProps;

export class ElasticCacheStack extends cdk.Stack {
  public readonly redisEndpoint: string;
  public readonly redisPort: string;
  public readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props: ElasticCacheStackProps) {
    super(scope, id, props);

    // Import the existing VPC
    this.vpc = ec2.Vpc.fromLookup(this, 'KogoVpc', {
      vpcId: vpcImport.vpcId,
    });

    // Use the private subnets from vpc.ts
    const redisSubnets = [vpcImport.subnets.private.usWest2a, vpcImport.subnets.private.usWest2b, vpcImport.subnets.private.usWest2c];

    // Create a security group for the Redis cluster
    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc: this.vpc,
    });

    // Allow inbound traffic on Redis port (6379) from the VPC
    redisSecurityGroup.addIngressRule(ec2.Peer.ipv4(this.vpc.vpcCidrBlock), ec2.Port.tcp(6379), 'Allow Redis access from VPC');

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
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: subnetGroup.ref,
    });

    // Export the Redis endpoint and port for use in the Lambda stack
    this.redisEndpoint = redisCluster.attrRedisEndpointAddress;
    this.redisPort = redisCluster.attrRedisEndpointPort;
  }
}
