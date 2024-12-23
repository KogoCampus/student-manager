import { APIGatewayProxyHandler } from 'aws-lambda';
import { doesUserExistByEmail, resetUserPassword } from '../../service/cognito';
import { successResponse, errorResponse, wrapHandler } from '../handlerUtil';
import { getEmailVerifiedToken, deleteEmailVerifiedToken } from '../../service/email/emailVerifiedToken';
import { CustomPasswordError, checkPasswordPolicy } from '../../service/passwordPolicy';

const passwordReset: APIGatewayProxyHandler = async event => {
  const email = event.queryStringParameters?.email;
  const emailVerifiedToken = event.queryStringParameters?.emailVerifiedToken;

  if (!email || !emailVerifiedToken) {
    return errorResponse('Email and email verified token are required', 400);
  }

  try {
    // Verify the email verified token
    const storedEmailVerifiedToken = await getEmailVerifiedToken(email);
    if (!storedEmailVerifiedToken) {
      return errorResponse('Email verified token has expired or does not exist', 401);
    }
    if (storedEmailVerifiedToken !== emailVerifiedToken) {
      return errorResponse('Invalid email verified token', 401);
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

    await checkPasswordPolicy(newPassword);

    // Reset the user password and remove the email verified token after successful password reset
    await resetUserPassword(email, newPassword);
    await deleteEmailVerifiedToken(email);

    return successResponse({ message: 'Password reset successfully' });
  } catch (error) {
    if (error instanceof CustomPasswordError) {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Password reset failed', 500);
  }
};

export const handler = wrapHandler(passwordReset);
