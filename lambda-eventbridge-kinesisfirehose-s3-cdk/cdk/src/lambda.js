const AWS = require('aws-sdk')
AWS.config.update({ region: process.env.AWS_REGION })
const eventbridge = new AWS.EventBridge({apiVersion: '2015-10-07'});
const EVENT_BUS_NAME = process.env.eventBusName;

exports.handler = async (event) => {
    console.log(JSON.stringify(event, null, 2));

    const params = {
        Entries: [
          {
            Detail: JSON.stringify({
              "message": event.message,
              "state": "new"
            }),
            DetailType: 'Message',
            EventBusName: EVENT_BUS_NAME,
            Source: 'demo.event',
            Time: new Date,
          }
        ]
    }

    try {
        // Send event to event bridge
        const response = await eventbridge.putEvents(params).promise();
        // Logs the response
        console.log(`Response from putObjectTagging SDK call ${JSON.stringify(response)}`);
        return {
            statusCode: 200,
            body: JSON.stringify({
                eventBridgeResponse: response,
            }),
        };
    } catch (err) {
        console.error(err)
        return {
            statusCode: 400,
            body: `Cannot process event: ${err}`,
        }
    }
}