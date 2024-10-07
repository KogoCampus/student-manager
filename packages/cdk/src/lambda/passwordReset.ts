import { APIGatewayProxyHandler } from 'aws-lambda';
import { doesUserExistByEmail, resetUserPassword } from '../utils/cognito';
import { successResponse, errorResponse, exceptionResponse } from '../utils/lambdaResponse';
import { RedisClient } from '../utils/redis';

export const handler: APIGatewayProxyHandler = async event => {
  try {
    const email = event.queryStringParameters?.email;
    const verificationCode = event.queryStringParameters?.verificationCode;

    if (!email || !verificationCode) {
      return errorResponse('Email and verification code are required', 400);
    }

    // Verify the email and verification code using Redis
    const redis = RedisClient.getInstance();
    const storedCode = await redis.get(email);
    if (!storedCode) {
      return errorResponse('Verification code has expired or does not exist', 400);
    }
    if (storedCode !== verificationCode) {
      return errorResponse('Invalid verification code', 400);
    }

    const userExists = await doesUserExistByEmail(email);
    if (!userExists) {
      return errorResponse('User does not exist with the provided email', 404);
    }

    const requestBody = JSON.parse(event.body || '{}');
    const { newPassword } = requestBody;

    if (!newPassword) {
      return errorResponse('New password is required', 400);
    }

    await resetUserPassword(email, newPassword);
    await redis.delete(email);

    return successResponse({ message: 'Password reset successfully' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return exceptionResponse(error);
  }
};
