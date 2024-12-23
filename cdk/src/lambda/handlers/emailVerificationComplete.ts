import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse, wrapHandler } from '../handlerUtil';
import { RedisClient } from '../../service/redis';
import { generateEmailVerifiedToken, storeEmailVerifiedToken } from '../../service/email/emailVerifiedToken';

const emailVerificationComplete: APIGatewayProxyHandler = async event => {
  const email = event.queryStringParameters?.email;
  const verificationCode = event.queryStringParameters?.verificationCode;

  if (!email || !verificationCode) {
    return errorResponse('Email and verification code are required', 400);
  }

  try {
    const redis = RedisClient.getInstance();

    const storedCode = await redis.get(email);
    if (!storedCode) {
      return errorResponse('No verification code found or it has expired', 400);
    }
    if (verificationCode !== storedCode) {
      return errorResponse('Invalid verification code', 401);
    }

    // Verification successful, delete the code from Redis
    await redis.delete(email);

    // Generate a new email verified token and store it in Redis
    const emailVerifiedToken = generateEmailVerifiedToken();
    await storeEmailVerifiedToken(email, emailVerifiedToken);

    return successResponse({
      message: 'Email verified successfully.',
      emailVerifiedToken,
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Verification failed', 500);
  }
};

export const handler = wrapHandler(emailVerificationComplete);
