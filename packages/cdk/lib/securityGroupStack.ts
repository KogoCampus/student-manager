import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

import awsImport from '../secrets/awsImport.decrypted.json';

type SecurityGroupStackProps = cdk.StackProps;

export class SecurityGroupStack extends cdk.Stack {
  public readonly elasticacheSecurityGroup: ec2.SecurityGroup;
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: SecurityGroupStackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, awsImport.vpc.vpcName, {
      vpcId: awsImport.vpc.vpcId,
    });

    // =================================================================
    // Lambda Common SG
    // =================================================================
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });

    // =================================================================
    // Elasticache SG
    // =================================================================
    this.elasticacheSecurityGroup = new ec2.SecurityGroup(this, 'ElasticacheSecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });

    // Allow Lambda security group to access ElastiCache on Redis port
    this.elasticacheSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(Number(6379)),
      'Allow Lambda to access ElastiCache on port 6379',
    );
  }
}
