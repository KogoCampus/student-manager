import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { successResponse, errorResponse, wrapHandler } from '../utils/handlerUtil';
import { buildEmailParams } from '../utils/emailService';
import { RedisClient } from '../utils/redis';
import { isDesignatedSchoolEmail } from '../utils/schoolInfo';

import awsImport from '../../secrets/awsImport.decrypted.json';

// Constants
const EXPIRATION_TIME = 900; // Set expiration to 15 minutes (900 seconds)

// SES Client
const SES = new SESClient({ region: awsImport.ses.sesIdentityRegion });

export const handlerImplementation: APIGatewayProxyHandler = async event => {
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

  const emailParams = buildEmailParams(email, 'verification', { verificationCode }, 'welcome@kogocampus.com');
  const command = new SendEmailCommand(emailParams);
  await SES.send(command);

  return successResponse({ message: 'Verification email sent' });
};

export const handler: APIGatewayProxyHandler = wrapHandler(handlerImplementation);
