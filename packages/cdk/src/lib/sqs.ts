import { SQSClient } from '@aws-sdk/client-sqs';

function getSQSClient(): { sqs: SQSClient; queueUrl: string } {
  // For local testing with SAM Local
  if (process.env.AWS_SAM_LOCAL) {
    return {
      sqs: new SQSClient({
        endpoint: 'http://host.docker.internal:4566', // LocalStack endpoint
        region: 'us-west-2',
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      }),
      queueUrl: process.env.PUSH_NOTIFICATION_QUEUE_URL || 'http://host.docker.internal:4566/000000000000/push-notification-queue',
    };
  }

  // For production
  return {
    sqs: new SQSClient({}),
    queueUrl: process.env.PUSH_NOTIFICATION_QUEUE_URL || '',
  };
}

export { getSQSClient }; 