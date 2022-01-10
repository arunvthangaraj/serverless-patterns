import express from "express";
import AWS from "aws-sdk";

const app = express();
const port = 80;
AWS.config.update({ region: process.env.region });

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const CLUSTER_ARN = process.env.clusterARN;
const CLUSTER_NAME = process.env.clusterName;

app.get("/", (req, res) => {
  res
    .status(200)
    .send(`Hello Serverless Fargate MSK ${CLUSTER_NAME} - ${CLUSTER_ARN}`);
});

app.listen(port, () => {
  // tslint:disable-next-line:no-console
  console.log(`server started at http://localhost:${port}`);
});
