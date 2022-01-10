import { CfnOutput, Construct, Stack, StackProps, RemovalPolicy } from '@aws-cdk/core';
import { PolicyStatement, Effect } from '@aws-cdk/aws-iam';
import { Vpc, SecurityGroup, Port } from '@aws-cdk/aws-ec2';
import { Cluster, ContainerImage } from '@aws-cdk/aws-ecs';
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns';
import * as msk from "@aws-cdk/aws-msk"
import { Key } from '@aws-cdk/aws-kms';
import path = require('path');

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'Vpc', {
      maxAzs: 2,
    });

    const kmsKey = new Key(this, 'MskKmsKey', {
      description: 'KMS Key used for MSK',
      alias: 'alias/MskKmsKey',
      enableKeyRotation: true,
      enabled: true,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const ecsTaskSG = new SecurityGroup(this, 'esc-task-sg', {
        vpc,
        allowAllOutbound: true,
        description: 'Security group for ecs task defininiton to connect to MSK cluster'
    });

    const mskCluster = new msk.Cluster(this, "mskCluster", {
        clusterName: 'myclusterviasimplecdk',
        kafkaVersion: msk.KafkaVersion.V2_8_1,
        vpc: vpc,
        ebsStorageInfo: {
          volumeSize: 50,
          encryptionKey: kmsKey
        },
        removalPolicy: RemovalPolicy.DESTROY,
        clientAuthentication: {
            saslProps: {
                iam: true
            }
        }
    });

    mskCluster.connections.allowFrom(ecsTaskSG, Port.allTraffic())

    const ecsCluster = new Cluster(this, 'ecsCluster', {
      vpc: vpc,
    });

    const fargate = new ApplicationLoadBalancedFargateService(this, 'FargateService', {
      cluster: ecsCluster,
      cpu: 512,
      desiredCount: 1,
      taskImageOptions: {
        image: ContainerImage.fromAsset(path.join(__dirname, '../src/')),
        environment: {
          region: process.env.CDK_DEFAULT_REGION!,
          clusterARN: mskCluster.clusterArn,
          clusterName: mskCluster.clusterName
        },
      },
      assignPublicIp: false,
      memoryLimitMiB: 2048,
      securityGroups: [
          ecsTaskSG
      ]
    });

    fargate.taskDefinition.taskRole.addToPrincipalPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['kafka:*'],
          resources: [`${mskCluster.clusterArn}`]
        })
      )

    new CfnOutput(this, 'MskClusterARN', { value: mskCluster.clusterArn });
  }
}
