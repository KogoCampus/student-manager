import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse, wrapHandler } from '../../lib/handlerUtil';
import { getUserDetailsFromAccessToken } from '../../lib/cognito';
import { RedisClient } from '../../lib/redis';

// Initialize Redis client instance
const redisClient = RedisClient.getInstance();
export const handlerImplementation: APIGatewayProxyHandler = async event => {
  const authorizationHeader = event.headers.Authorization || event.headers.authorization;

  if (!authorizationHeader) {
    return errorResponse('Authorization header is missing', 400);
  }

  const accessToken = authorizationHeader.split(' ')[1];
  console.log(`Access token: ${accessToken}`);
  if (!accessToken) {
    return errorResponse('Auth token is missing', 400);
  }

  // Here you can extract the push token from the query string
  const pushToken = event.queryStringParameters?.push_token;
  if (!pushToken) {
    return errorResponse('Push token is missing', 400);
  }

  let user;
  try {
    console.log('Retrieving user details from access token');
    user = await getUserDetailsFromAccessToken(accessToken);
  } catch (error) {
    return errorResponse(`Failed to retrieve user from access token: ${error}`, 500);
  }

  const userName = user.username;
  if (!userName) {
    return errorResponse('Username not found in access token', 401);
  }

  // Save the push token in Redis with the user's unique identifier
  try {
    // Store the push token for the user in Redis
    const redisKey = `push_token:${userName}`; // Store the push token for the user
    await redisClient.setWithExpiry(redisKey, pushToken, 24 * 60 * 60); // Set with a 24-hour expiry (optional)

    console.log(await redisClient.get(redisKey));

    return successResponse({ message: 'Push token updated successfully for user' });
  } catch (error) {
    console.error(`Error updating push token: ${error}`);
    return errorResponse('Internal server error', 500);
  }
};

export const handler: APIGatewayProxyHandler = wrapHandler(handlerImplementation);
