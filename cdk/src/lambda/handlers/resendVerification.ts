import { APIGatewayProxyHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { successResponse, errorResponse, wrapHandler } from '../handlerUtil';
import { buildEmailParams } from '../../service/email';
import { RedisClient } from '../../service/redis';
import { settings } from '../../settings';

// Constants
const EXPIRATION_TIME = 900; // 15 minutes for the verification code expiry
const RESEND_WAIT_TIME = 30; // 30 seconds wait time for resending the code

// SES Client
const SES = new SESClient({ region: settings.ses.sesIdentityRegion });

const resendVerification: APIGatewayProxyHandler = async event => {
  const email = event.queryStringParameters?.email;
  if (!email) {
    return errorResponse('Email query parameter is required', 400);
  }

  try {
    const redis = RedisClient.getInstance();

    // Check if the resend wait time has passed
    const resendKey = `resend:${email}`;
    const resendState = await redis.get(resendKey);
    if (resendState) {
      return errorResponse('Please wait before requesting a new verification code', 429);
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set the new verification code with expiry in Redis
    await redis.setWithExpiry(email, verificationCode, EXPIRATION_TIME);
    await redis.setWithExpiry(resendKey, 'wait', RESEND_WAIT_TIME);

    // Prepare and send the verification email
    const emailParams = buildEmailParams(email, 'verification', { verificationCode }, 'welcome@kogocampus.com');
    const command = new SendEmailCommand(emailParams);
    await SES.send(command);

    return successResponse({ message: 'Verification code resent successfully' });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Failed to resend verification code', 500);
  }
};

export const handler = wrapHandler(resendVerification);
