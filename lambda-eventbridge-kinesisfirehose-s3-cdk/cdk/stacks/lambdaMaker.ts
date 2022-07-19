import { CfnOutput, Duration, PhysicalName } from "aws-cdk-lib";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import * as Lambda from "aws-cdk-lib/aws-Lambda";
import { Construct } from "constructs";
import { SQSMaker, SQSMakerResult } from "./sqsMaker";
import * as SQS from 'aws-cdk-lib/aws-sqs';

export interface LambdaMakerResult {
    function: Lambda.Function,
    outputs: CfnOutput[];
    deadLetterQueueMakerResult: SQSMakerResult
}



export abstract class LambdaMaker {
    static makeLambda(scope: Construct, functionName: string): LambdaMakerResult {
        const sqsMakerResult = SQSMaker.makeQueue(scope, functionName);
        const lamdbaFunction = this.createFunction(scope, functionName, sqsMakerResult.queue);
        const result: LambdaMakerResult = {
            function: lamdbaFunction,
            deadLetterQueueMakerResult: sqsMakerResult,
            outputs: [
                new CfnOutput(scope, PhysicalName.GENERATE_IF_NEEDED, {
                    value: lamdbaFunction.node.id,
                    exportName: 'lambda-event-maker-id'
                }),
                new CfnOutput(scope, PhysicalName.GENERATE_IF_NEEDED, {
                    value: lamdbaFunction.functionName,
                    exportName: 'lambda-event-maker-functionName',
                    description: "The name of the lambda function as supplied by CloudFormation"
                }),
                new CfnOutput(scope, PhysicalName.GENERATE_IF_NEEDED, {
                    value: lamdbaFunction.functionArn,
                    exportName: 'lambda-event-maker-functionArn',
                    description: "The ARN of the newly created lambda function"
                })            ]
        };

        return result;
    }

    private static createFunction(scope: Construct, functionName: string, dlq: SQS.Queue, environment?: {[key: string]: string}): Lambda.Function {
        
        const lambdaFunction = new Lambda.Function(scope, PhysicalName.GENERATE_IF_NEEDED, {
            runtime: Lambda.Runtime.NODEJS_14_X,
            handler: 'Lambda.handler',
            code: Lambda.Code.fromAsset(`${__dirname}/src`),
            environment: environment,
            functionName: functionName,
            timeout: Duration.minutes(5),
            deadLetterQueue: dlq
        });
        
        return lambdaFunction;
    }

    private static addDLQ(lambdaFunction: Lambda.Function): void {

    }
}