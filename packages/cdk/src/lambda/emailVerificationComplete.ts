import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse, exceptionResponse } from '../utils/lambdaResponse';
import { RedisClient } from '../utils/redis';
import { generateAuthToken, storeAuthToken } from '../utils/authToken';

export const handler: APIGatewayProxyHandler = async event => {
  try {
    const email = event.queryStringParameters?.email;
    const verificationCode = event.queryStringParameters?.verificationCode;

    if (!email || !verificationCode) {
      return errorResponse('Email and verification code are required', 400);
    }

    const redis = RedisClient.getInstance();

    // Retrieve the verification code from Redis
    const storedCode = await redis.get(email);
    if (!storedCode) {
      return errorResponse('No verification code found or it has expired', 400);
    }

    if (verificationCode !== storedCode) {
      return errorResponse('Invalid verification code', 401); // Changed from 400 to 401
    }

    // Verification successful, delete the code from Redis
    await redis.delete(email);

    // Generate a new auth token
    const authToken = generateAuthToken();

    // Store the auth token in Redis
    await storeAuthToken(email, authToken);

    return successResponse({
      message: 'Email verified successfully.',
      authToken,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return exceptionResponse(error);
  }
};