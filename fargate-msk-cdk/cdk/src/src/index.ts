import express from "express";
import AWS from "aws-sdk";
import Kafka from "kafkajs";

const app = express();
const port = 80;
AWS.config.update({ region: process.env.region });

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const awsKafka = new AWS.Kafka({ apiVersion: "2018-11-14" });

const CLUSTER_ARN = process.env.clusterARN;
const CLUSTER_NAME = process.env.clusterName;

app.get("/", (req, res) => {
  res
    .status(200)
    .send(`Hello Serverless Fargate MSK ${CLUSTER_NAME} - ${CLUSTER_ARN}`);
});

app.post("/createTopic", async (req, res) => {
  const topicConfig = {
    topic: req.body.TopicName,
  };

  const params = {
    ClusterArn: CLUSTER_ARN,
  };

  try {
    const brokers = await awsKafka.getBootstrapBrokers(params).promise();

    const kafkaClient = new Kafka.Kafka({
      clientId: "fargate-msk-client",
      brokers: brokers.BootstrapBrokerStringSaslIam.split(","),
      ssl: true,
    });

    await kafkaClient.admin().connect();
    await kafkaClient.admin().createTopics({
      topics: [topicConfig],
      waitForLeaders: true,
    });

    res.status(201).send(`Topic ${req.body.TopicName} created successfully`);
  } catch (err) {
    return res.send(err);
  }
});

app.listen(port, () => {
  // tslint:disable-next-line:no-console
  console.log(`server started at http://localhost:${port}`);
});
