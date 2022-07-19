import { Construct } from "constructs";
import * as Kinesis from 'aws-cdk-lib/aws-kinesisfirehose'
import { CfnOutput, PhysicalName } from "aws-cdk-lib";
import * as IAM from 'aws-cdk-lib/aws-IAM';
import { S3BucketMakerResult } from "./s3BucketMaker";

export interface  KinesisDeliveryStreamMakerResult {
    deliveryStream: Kinesis.CfnDeliveryStream;
    outputs: CfnOutput[];
    iamRole: IAM.Role
}

type S3Config = Kinesis.CfnDeliveryStream.S3DestinationConfigurationProperty


export abstract class KinesisStreamMaker {

    

    static makeDeliveryStream(scope: Construct, bucketMakerResult: S3BucketMakerResult): KinesisDeliveryStreamMakerResult {
        const deliveryStreamRole = KinesisStreamMaker.makeDeliveryStreamRole(scope, bucketMakerResult);

        const deliveryStream = new Kinesis.CfnDeliveryStream(scope, PhysicalName.GENERATE_IF_NEEDED, {
            deliveryStreamName: PhysicalName.GENERATE_IF_NEEDED,
            deliveryStreamType: "DirectPut",
            s3DestinationConfiguration: KinesisStreamMaker.makeS3DestinationConfigurationObject(deliveryStreamRole, bucketMakerResult)
        });

        return  {
            deliveryStream: deliveryStream,
            iamRole: deliveryStreamRole,
            outputs: this.makeOutputArray(scope, deliveryStream)
        };
    }

    private static makeS3DestinationConfigurationObject(deliveryStreamRole: IAM.Role, bucketMakerResult: S3BucketMakerResult): S3Config {
        return {
            roleArn: deliveryStreamRole.roleArn,
            bucketArn: bucketMakerResult.bucket.bucketArn,
            compressionFormat: "GZIP",
            bufferingHints: {
              intervalInSeconds: 60
            }
          }
    }

    private static makeDeliveryStreamRole(scope: Construct, bucketMakerResult: S3BucketMakerResult): IAM.Role {
        return new IAM.Role(scope, PhysicalName.GENERATE_IF_NEEDED, {
            assumedBy: new IAM.ServicePrincipal('firehose.amazonaws.com'),
            description: 'The IAM role that gives this delivery stream the permissions to write to the targeted S3 bucket.',
            inlinePolicies: {
              FirehosePolicy: bucketMakerResult.iamPolicy,
            }
        });
    }

    private static makeOutputArray(scope: Construct, deliveryStream: Kinesis.CfnDeliveryStream): CfnOutput[] {
        return [
            new CfnOutput(scope, PhysicalName.GENERATE_IF_NEEDED, {
                value: deliveryStream.node.id,
                exportName: "kinesis-eventbus-deliveryStreamID",
                description: "The physical resource name of delivery stream that the source event bus will write events to"
            }),
            new CfnOutput(scope, PhysicalName.GENERATE_IF_NEEDED, {
                value: deliveryStream.attrArn,
                exportName: "kinesis-eventbus-deliveryStreamArn",
                description: "The ARN of the delivery stream that the source event bus will write events to"
            }),
            new CfnOutput(scope, PhysicalName.GENERATE_IF_NEEDED, {
                value: deliveryStream.deliveryStreamName!,
                exportName: "kinesis-eventbus-deliveryStreamName",
                description: "The name of the delivery stream that the source event bus will write events to"
            })
        ]
    }
}