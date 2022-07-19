import { Construct } from "constructs";
import * as S3 from 'aws-cdk-lib/aws-S3'
import * as IAM from 'aws-cdk-lib/aws-iam';
import { CfnOutput, PhysicalName, RemovalPolicy } from "aws-cdk-lib";


export interface S3BucketMakerResult {
    bucket: S3.Bucket,
    iamPolicy: IAM.PolicyDocument,
    outputs: CfnOutput[]
}


export abstract class S3BucketMaker {
    static makeBucket(scope: Construct): S3BucketMakerResult {
        const bucket = new S3.Bucket(scope, PhysicalName.GENERATE_IF_NEEDED, {
            blockPublicAccess: S3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: RemovalPolicy.DESTROY
        });

        return  {
            bucket: bucket,
            iamPolicy: S3BucketMaker.makeBucketPolicy(bucket),
            outputs: [
                new CfnOutput(scope, PhysicalName.GENERATE_IF_NEEDED, {
                    value: bucket.node.id,
                    exportName: "kinesis-s3-target-bucketID",
                    description: "The S3 bucket physical resource name that the Kinesis Firehose Delivery Stream will deliver events from event bus to."
                }),
                new CfnOutput(scope, PhysicalName.GENERATE_IF_NEEDED, {
                    value: bucket.bucketArn,
                    exportName: "kinesis-s3-target-bucketArn",
                    description: "The S3 bucket ARN that the Kinesis Firehose Delivery Stream will deliver events from event bus to."
                }),
                new CfnOutput(scope, PhysicalName.GENERATE_IF_NEEDED, {
                    value: bucket.bucketName,
                    exportName: "kinesis-s3-target-bucketName",
                    description: "The S3 bucket name that the Kinesis Firehose Delivery Stream will deliver events from event bus to."
                })
            ]
        }
    }

    private static makeBucketPolicy(bucket: S3.Bucket): IAM.PolicyDocument {
        return new IAM.PolicyDocument({
            statements: [
              new IAM.PolicyStatement({
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
          })
    }
}