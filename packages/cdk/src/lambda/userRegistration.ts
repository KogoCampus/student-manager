import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse, exceptionResponse } from '../utils/lambdaResponse';
import { RedisClient } from '../utils/redis';
import { createUserInCognito } from '../utils/cognito';

export const handler: APIGatewayProxyHandler = async event => {
  try {
    const email = event.queryStringParameters?.email;
    const submittedCode = event.queryStringParameters?.verificationCode;
    if (!email || !submittedCode) {
      return errorResponse('Email and verification code are required', 400);
    }

    // Get username and password from the request body
    const requestBody = JSON.parse(event.body || '{}');
    const { username, password } = requestBody;
    if (!username || !password) {
      return errorResponse('Username and password are required in the request body', 400);
    }

    const redis = RedisClient.getInstance();

    // Retrieve the verification code from Redis
    const storedCode = await redis.get(email);
    if (!storedCode) {
      return errorResponse('No verification code found or it has expired', 400);
    }
    if (submittedCode !== storedCode) {
      return errorResponse('Invalid verification code', 400);
    }

    // Verification successful, delete the code from Redis
    await redis.delete(email);

    // Create a new user in Cognito
    await createUserInCognito(email, username, password);

    return successResponse({ message: 'User successfully created' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return exceptionResponse(error);
  }
};
