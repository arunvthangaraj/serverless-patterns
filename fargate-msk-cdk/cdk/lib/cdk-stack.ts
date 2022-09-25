import { CfnOutput, Construct, RemovalPolicy, Stack, StackProps } from '@aws-cdk/core';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { Port, SecurityGroup, Vpc } from '@aws-cdk/aws-ec2';
import { Cluster, ContainerImage } from '@aws-cdk/aws-ecs';
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns';
import * as msk from "@aws-cdk/aws-msk"
import { Key } from '@aws-cdk/aws-kms';
import { Secret } from "@aws-cdk/aws-secretsmanager";
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
    const msk_key = new Key(this, 'kafkaKey')

    const ecsTaskSG = new SecurityGroup(this, 'esc-task-sg', {
        vpc,
        allowAllOutbound: true,
        description: 'Security group for ecs task defininiton to connect to MSK cluster'
    });

    const mskCluster = new msk.Cluster(this, "mskCluster", {
        clusterName: this.getClusterName(),
        kafkaVersion: msk.KafkaVersion.V2_8_1,
        vpc: vpc,
        ebsStorageInfo: {
          volumeSize: 50,
          encryptionKey: kmsKey
        },
        removalPolicy: RemovalPolicy.DESTROY,
        clientAuthentication: {
            saslProps: {
                scram: true
            }
        }
    });


    mskCluster.connections.allowFrom(ecsTaskSG, Port.allTraffic())
    mskCluster.addUser(this.getDefaultUserNameForMskUser());

    // const mskUserSecret = Secret.fromSecretNameV2(this, "SecretFromPartialArn", `AmazonMSK_${this.getClusterName()}_${this.getDefaultUserNameForMskUser()}`);
    const mskUserSecret = Secret.fromSecretNameV2(this, "SecretFromPartialArn","AmazonMSK_myclusterviasimplecdk_AmazonMSK_user");

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
          clusterName: mskCluster.clusterName,
            secret: mskUserSecret.secretValueFromJson("password").toString(),
            username: mskUserSecret.secretValueFromJson("username").toString(),
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

      new CfnOutput(this, 'MskClusterARN', { value: mskCluster.clusterArn});
  }

    private getDefaultUserNameForMskUser() {
        return "AmazonMSK_user";
    }

    private getClusterName() {
        return "myclusterviasimplecdk";
    }
}
