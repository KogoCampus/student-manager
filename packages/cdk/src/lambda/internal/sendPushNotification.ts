import { APIGatewayProxyHandler } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { successResponse, errorResponse, wrapHandler } from '../../lib/handlerUtil';
import { getUserDetailsFromAccessToken } from '../../lib/cognito';
import { RedisClient } from '../../lib/redis';
import { getSQSClient } from '../../lib/sqs';

const { sqs, queueUrl } = getSQSClient();
const redis = RedisClient.getInstance();

interface PushNotificationPayload {
  recipients: string[];  // Array of Cognito ID tokens
  notification: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  };
}

export const handlerImplementation: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return errorResponse('Missing request body', 400);
    }

    const payload: PushNotificationPayload = JSON.parse(event.body);
    
    if (!payload.recipients || !Array.isArray(payload.recipients) || payload.recipients.length === 0) {
      return errorResponse('Recipients array is required and must not be empty', 400);
    }

    if (!payload.notification?.title || !payload.notification?.body) {
      return errorResponse('Notification title and body are required', 400);
    }

    // Convert Cognito ID tokens to usernames
    const usernames = await Promise.all(
      payload.recipients.map(async (token) => {
        try {
          const userDetails = await getUserDetailsFromAccessToken(token);
          return userDetails.username;
        } catch (error) {
          console.error('Error getting user details:', error);
          return null;
        }
      })
    );

    // Filter out failed token conversions
    const validUsernames = usernames.filter((username): username is string => username !== null);

    // Get push tokens from Redis
    const pushTokens = await Promise.all(
      validUsernames.map(async (username) => {
        const token = await redis.get(`push_token:${username}`);
        return token ? { username, pushToken: token } : null;
      })
    );

    // Filter out users without push tokens
    const validPushTokens = pushTokens.filter((token): token is { username: string; pushToken: string } => token !== null);

    if (validPushTokens.length === 0) {
      return errorResponse('No valid push tokens found for the provided recipients', 400);
    }

    // Prepare message for SQS
    const message = {
      pushTokens: validPushTokens.map(token => token.pushToken),
      notification: payload.notification,
    };

    // Send to SQS
    await sqs.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
    }));

    return successResponse({
      message: 'Push notification queued successfully',
      recipientCount: validPushTokens.length,
    });
  } catch (error) {
    console.error('Error processing push notification:', error);
    return errorResponse('Internal server error', 500);
  }
};

export const handler: APIGatewayProxyHandler = wrapHandler(handlerImplementation);
