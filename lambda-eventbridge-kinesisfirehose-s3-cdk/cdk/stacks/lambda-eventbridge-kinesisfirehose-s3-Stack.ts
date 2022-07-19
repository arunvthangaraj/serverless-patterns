import { PhysicalName, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from "aws-cdk-lib/aws-events-targets";
import { LambdaMaker } from './lambdaMaker';
import { S3BucketMaker } from './s3BucketMaker';
import { KinesisStreamMaker } from './kinesisStreamMaker';

export interface LambdaEventBridgeKinsesisS3StackStackProps extends StackProps {
  eventPatternSource: string[]
}


export class LambdaEventBridgeKinsesisS3Stack extends Stack {


  constructor(scope: Construct, id: string, props?: LambdaEventBridgeKinsesisS3StackStackProps) {
    super(scope, id, props);

    // collect the resources we need for this pattern

    const bucketMakerResult = S3BucketMaker.makeBucket(this);
    const lamdbaMakerResult = LambdaMaker.makeLambda(this, `${this.constructor.name}-${id}-eventGeneratorLambda`)
    const deliveryStreamMakerResult = KinesisStreamMaker.makeDeliveryStream(this, bucketMakerResult);


    // setup the event bus

    const bus = new events.EventBus(this, PhysicalName.GENERATE_IF_NEEDED, {});
    const eventRule = new events.Rule(this, PhysicalName.GENERATE_IF_NEEDED, {
      eventPattern: {
        source: props?.eventPatternSource,
      },
      eventBus: bus
    });
    bus.grantPutEventsTo(lamdbaMakerResult.function);

    // point lambda to our event bus

    lamdbaMakerResult.function.addEnvironment("eventBusName", bus.eventBusName);


    // point event bus to kinesis delivery stream

    eventRule.addTarget(new targets.KinesisFirehoseStream(deliveryStreamMakerResult.deliveryStream, {}));
    
  }
}
