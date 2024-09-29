import { APIGatewayProxyHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { successResponse, errorResponse, exceptionResponse } from '../utils/lambdaResponse';
import { buildEmailParams } from '../utils/sendEmail';
import { RedisClient } from '../utils/redis';
import ses from '../../lib/import/ses';

import designatedSchools from '../constants/email.json'; // Import school data

// Define the types for school data
interface SchoolInfo {
  domain: string;
  fullName: string;
  shortenedName: string;
}

// Utility function to check if an email belongs to a designated school
function isDesignatedSchoolEmail(email: string): boolean {
  const domain = email.split('@')[1];
  return Object.values(designatedSchools as { [key: string]: SchoolInfo }).some(school => school.domain === `@${domain}`);
}

// SES Client
const SES = new SESClient({ region: ses.sesIdentityRegion });
const EXPIRATION_TIME = 900; // Set expiration to 15 minutes (900 seconds)

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

    const emailParams = buildEmailParams(
      email,
      'verification', // Use case for verification
      { verificationCode }, // Dynamic data to replace in the template
      'no-reply@kogocampus.com', // The source (sender) email address
    );
    const command = new SendEmailCommand(emailParams);
    await SES.send(command);

    return successResponse({ message: 'Verification email sent' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return exceptionResponse(error);
  }
};
