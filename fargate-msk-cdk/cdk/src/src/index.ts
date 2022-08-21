import express from "express";
import AWS from "aws-sdk";
import Kafka from "kafkajs";
import { GetBootstrapBrokersRequest } from "aws-sdk/clients/kafka";
import { Response } from "express-serve-static-core";

const app = express();

const port = 80;
AWS.config.update({ region: process.env.region });

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const awsKafka = new AWS.Kafka({ apiVersion: "2018-11-14" });

const CLUSTER_ARN = process.env.clusterARN;
const CLUSTER_NAME = process.env.clusterName;

console.log(`secret ${process.env.secret!}`);
console.log(`uname ${process.env.username!}`);
async function kc(): Promise<Kafka.Kafka> {
  const params: GetBootstrapBrokersRequest = {
    ClusterArn: CLUSTER_ARN!,
  };

  const brokerString = await awsKafka
    .getBootstrapBrokers(params)
    .promise()
    .then((value) => value.BootstrapBrokerStringSaslScram?.split(","));

  const kafkaClient = new Kafka.Kafka({
    clientId: "fargate-msk-client",
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    brokers: brokerString!,
    ssl: true,
    sasl: {
      mechanism: "scram-sha-512", // scram-sha-256 or scram-sha-512
      username: "AmazonMSK_user",
      password: process.env.secret!,
    },
  });
  await kafkaClient
    .admin()
    .connect()
    .then(() => console.log("successfully connected"))
    .catch(() => console.log("Failed to connect"));
  return kafkaClient;
}
console.log("Secret from stack " + process.env.secret);

app.get("/hello", (req, res) => {
  res
    .status(200)
    .send(`Hello Serverless Fargate MSK ${CLUSTER_NAME} - ${CLUSTER_ARN}`);
});

app.get("/", async (req, res) => {
  console.log("/list");
  function successfulResponse(topics: string[]) {
    return res.status(200).send(`Topics ${topics}`);
  }
  try {
    const topics = await kc().then((client) => {
      client
        .admin()
        .listTopics()
        .then((topics) => successfulResponse(topics));
    });
  } catch (err) {
    return res.send(err);
  }
});

app.delete("/:topic", async function (req, res) {
  console.log(req.params.topic);

  function deletedResponse(topic: string) {
    return res.status(200).send(`Topic ${topic} deleted`);
  }
  try {
    await kc().then((client) => {
      client
        .admin()
        .deleteTopics({ topics: [req.params.topic] })
        .then(() => deletedResponse(req.params.topic));
    });
  } catch (err) {
    return res.send(err);
  }
});

app.post("/", async (req, res) => {
  console.log("Creating a new Topic");
  const topicConfig = {
    topic: req.body.TopicName,
  };

  function createdResponse(isCreated: boolean) {
    return res
      .status(201)
      .send(`Topic ${req.body.TopicName} created successfully? ${isCreated}`);
  }

  function getOptions() {
    return {
      topics: [topicConfig],
      waitForLeaders: true,
    };
  }

  try {
    await kc().then((client) => {
      client.admin().createTopics(getOptions()).then(createdResponse);
    });
  } catch (err) {
    return res.send(err);
  }
});

app.listen(port, () => {
  // tslint:disable-next-line:no-console
  console.log(`server started at http://localhost:${port}`);
});
