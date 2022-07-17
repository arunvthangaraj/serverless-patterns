import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as firehose from "aws-cdk-lib/aws-kinesisfirehose";
import * as iam from "aws-cdk-lib/aws-iam";

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 's3-bucket-for-kinesis', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const bus = new events.EventBus(this, 'bus', {
      eventBusName: 'DemoEventBus',
    });

    const lambdaFunction = new lambda.Function(this, 'event-generator', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        eventBusName: bus.eventBusName
      },
      timeout: Duration.minutes(5)
    });

    bus.grantPutEventsTo(lambdaFunction);

    const rule = new events.Rule(this, 'rule', {
      eventPattern: {
        source: ["demo.event"],
      },
      eventBus: bus
    });

    const firehosePolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: [`${bucket.bucketArn}`, `${bucket.bucketArn}/*`],
          actions: [
            "s3:AbortMultipartUpload",
            "s3:GetBucketLocation",
            "s3:GetObject",
            "s3:ListBucket",
            "s3:ListBucketMultipartUploads",
            "s3:PutObject",
          ],
        }),
      ],
    });

    const firehoseRole = new iam.Role(this, 'firehose-iam-role', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
      description: 'An IAM role for firehose',
      inlinePolicies: {
        FirehosePolicy: firehosePolicy,
      }
    });

    const firehoseStream = new firehose.CfnDeliveryStream(this, 'firehose-delivery-stream', {
      deliveryStreamName: "s3-delivery-stream",
      deliveryStreamType: "DirectPut"
    });

    firehoseStream.s3DestinationConfiguration = {
      roleArn: firehoseRole.roleArn,
      bucketArn: bucket.bucketArn,
      compressionFormat: "GZIP",
      bufferingHints: {
        intervalInSeconds: 60
      }
    }

    rule.addTarget(new targets.KinesisFirehoseStream(firehoseStream, {}));
    
  }
}
