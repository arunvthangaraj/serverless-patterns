import { CfnOutput, PhysicalName, RemovalPolicy } from 'aws-cdk-lib';
import { Alarm, Unit } from 'aws-cdk-lib/aws-cloudwatch';
import * as SQS from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';



export interface SQSMakerResult {
    queue: SQS.Queue;
    outputs: CfnOutput[];
    alarm: Alarm
}


export abstract class SQSMaker {

    static makeQueue(scope: Construct, dlqFor: string): SQSMakerResult {
        const queue = new SQS.Queue(scope, PhysicalName.GENERATE_IF_NEEDED, {
            encryption: SQS.QueueEncryption.KMS_MANAGED,
            removalPolicy: RemovalPolicy.RETAIN
        });

        const dlqMessageArrivalMetric = queue.metricNumberOfMessagesReceived({
            unit: Unit.COUNT
        });

        const dlqAlarm = dlqMessageArrivalMetric.createAlarm(scope, PhysicalName.GENERATE_IF_NEEDED, {
            threshold: 1,
            evaluationPeriods: 1
        })
        

        return  {
            queue: queue,
            alarm: dlqAlarm,
            outputs: [
                new CfnOutput(scope, PhysicalName.GENERATE_IF_NEEDED, {
                    value: queue.node.id,
                    exportName: `dlq-${dlqFor}-queueID`,
                    description: "The AWS resource id of the queue."
                }),
                new CfnOutput(scope, PhysicalName.GENERATE_IF_NEEDED, {
                    value: queue.queueArn,
                    exportName: `dlq-${dlqFor}-queueArn`,
                    description: "The ARN of the queue."
                }),
                new CfnOutput(scope, PhysicalName.GENERATE_IF_NEEDED, {
                    value: queue.queueName,
                    exportName: `dlq-${dlqFor}-queueName`,
                    description: "The physical resource name of the queue."
                }),
                new CfnOutput(scope, PhysicalName.GENERATE_IF_NEEDED, {
                    value: queue.queueUrl,
                    exportName: `dlq-${dlqFor}-queueUrl`,
                    description: "The physical resource name of the queue."
                })
            ]
        }
    }

}