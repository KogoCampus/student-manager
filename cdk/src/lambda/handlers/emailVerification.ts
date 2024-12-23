import { APIGatewayProxyHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { successResponse, errorResponse, wrapHandler } from '../handlerUtil';
import { buildEmailParams } from '../../service/email';
import { RedisClient } from '../../service/redis';
import { isDesignatedSchoolEmail } from '../../service/school';
import { settings } from '../../settings';
import { doesUserExistByEmail } from '../../service/cognito';

// Constants
const EXPIRATION_TIME = 900; // Set expiration to 15 minutes (900 seconds)

// SES Client
const SES = new SESClient({ region: settings.ses.sesIdentityRegion });

const emailVerification: APIGatewayProxyHandler = async event => {
  const email = event.queryStringParameters?.email;

  if (!email) {
    return errorResponse('Email query parameter is required', 400);
  }

  if (!isDesignatedSchoolEmail(email)) {
    return errorResponse('Email is not from a designated school domain', 400);
  }

  // Check if a user with the same email already exists
  const doesUserExist = await doesUserExistByEmail(email);
  if (doesUserExist) {
    return errorResponse('User already exists with the provided email', 409);
  }

  try {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const redis = RedisClient.getInstance();
    await redis.setWithExpiry(email, verificationCode, EXPIRATION_TIME);

    const emailParams = buildEmailParams(email, 'verification', { verificationCode }, 'welcome@kogocampus.com');
    const command = new SendEmailCommand(emailParams);
    await SES.send(command);

    return successResponse({ message: 'Verification email sent' });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Failed to send verification email', 500);
  }
};

export const handler = wrapHandler(emailVerification);
