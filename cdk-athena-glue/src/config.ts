// Please make sure to have CodeCommit Repository in the same account and region where
// Code Pipeline is running.

const prefix = '-oak'; // This will help to have S3 Bucket with unique name

export const config = {
    account: '',
    region: '',
    CDK_CLI_VERSION: '1.132.0',
    databaseName: 'employeeroster',
    empMaster: 'emp_master',
    empDetails: 'emp_details',
    s3EmpMaster: `s3empaster${prefix}`,
    workgroupName: 'viewWorkGroup',
    queryBucketName: `aviewquery${prefix}`
}