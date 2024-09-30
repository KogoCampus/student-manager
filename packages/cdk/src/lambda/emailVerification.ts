import { APIGatewayProxyHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { successResponse, errorResponse, exceptionResponse } from '../utils/lambdaResponse';
import { buildEmailParams } from '../utils/sendEmail';
import { RedisClient } from '../utils/redis';
import { isDesignatedSchoolEmail } from '../utils/schoolInfo';

import sesImport from '../../lib/import/ses.decrypted.json';

// Constants
const EXPIRATION_TIME = 900; // Set expiration to 15 minutes (900 seconds)

// SES Client
const SES = new SESClient({ region: sesImport.sesIdentityRegion });

export const handler: APIGatewayProxyHandler = async event => {
  try {
    const email = event.queryStringParameters?.email;

    if (!email) {
      return errorResponse('Email query parameter is required', 400);
    }

    if (!isDesignatedSchoolEmail(email)) {
      return errorResponse('Email is not from a designated school domain', 400);
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const redis = RedisClient.getInstance();

    // Set verification code with expiry in Redis
    await redis.setWithExpiry(email, verificationCode, EXPIRATION_TIME);

    const emailParams = buildEmailParams(email, 'verification', { verificationCode }, 'no-reply@kogocampus.com');
    const command = new SendEmailCommand(emailParams);
    await SES.send(command);

    return successResponse({ message: 'Verification email sent' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return exceptionResponse(error);
  }
};
