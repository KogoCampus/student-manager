import { Handler } from 'aws-lambda';
import { RedisClient } from '../../lib/redis';
import fetch from 'node-fetch';

const redis = RedisClient.getInstance();
const PUSH_NOTIFICATION_QUEUE = 'push_notification_queue';
const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

interface PushNotificationMessage {
  pushTokens: string[];
  notification: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  };
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: 'default';
  priority: 'high';
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

export const handlerImplementation: Handler = async () => {
  console.log('Starting push notification processing...');

  try {
    // Get message from queue (with 20-second timeout)
    const message = await redis.blpop(PUSH_NOTIFICATION_QUEUE, 20);

    if (!message) {
      console.log('No messages in queue');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No messages to process' }),
      };
    }

    const [_, messageData] = message;
    console.log('Received message from queue:', messageData);

    const pushNotification: PushNotificationMessage = JSON.parse(messageData);
    console.log(`Processing ${pushNotification.pushTokens.length} push tokens`);

    // Split tokens into chunks of 100 (Expo's limit)
    const chunkSize = 100;
    const tokenChunks = [];
    for (let i = 0; i < pushNotification.pushTokens.length; i += chunkSize) {
      tokenChunks.push(pushNotification.pushTokens.slice(i, i + chunkSize));
    }

    // Process each chunk
    for (const [index, tokenChunk] of tokenChunks.entries()) {
      console.log(`Processing chunk ${index + 1}/${tokenChunks.length} (${tokenChunk.length} tokens)`);

      const messages: ExpoMessage[] = tokenChunk.map(token => ({
        to: token,
        title: pushNotification.notification.title,
        body: pushNotification.notification.body,
        data: pushNotification.notification.data || {},
        sound: 'default',
        priority: 'high',
      }));

      try {
        console.log('Sending messages to Expo:', JSON.stringify(messages));

        const response = await fetch(EXPO_PUSH_API, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify(messages),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const responseData = await response.json();
        console.log('Expo API response:', JSON.stringify(responseData));

        // The Expo API returns { data: ExpoTicket[] }
        const tickets: ExpoTicket[] = responseData.data || [];

        if (!Array.isArray(tickets)) {
          console.error('Unexpected response format from Expo API:', responseData);
          continue;
        }

        // Process and log results
        tickets.forEach((ticket, i) => {
          if (ticket.status === 'ok') {
            console.log(`Successfully sent notification to token: ${tokenChunk[i]}, ticket ID: ${ticket.id}`);
          } else {
            console.error(`Failed to send notification to token: ${tokenChunk[i]}`, {
              error: ticket.message,
              details: ticket.details,
            });
          }
        });
      } catch (error) {
        console.error('Error sending push notifications batch:', error);
        // Continue with next chunk even if this one failed
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Push notification processing completed',
        processedTokens: pushNotification.pushTokens.length,
      }),
    };
  } catch (error) {
    console.error('Fatal error processing push notifications:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing push notifications',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export const handler: Handler = handlerImplementation;
