import { APIGatewayProxyHandler } from 'aws-lambda';
import { doesUserExistByEmail, resetUserPassword } from '../utils/cognito';
import { successResponse, errorResponse, exceptionResponse } from '../utils/lambdaResponse';
import { getAuthToken, deleteAuthToken } from '../utils/authToken';

export const handler: APIGatewayProxyHandler = async event => {
  try {
    const email = event.queryStringParameters?.email;
    const authToken = event.queryStringParameters?.authToken;

    if (!email || !authToken) {
      return errorResponse('Email and authorization token are required', 400);
    }

    // Verify the auth token
    const storedAuthToken = await getAuthToken(email);
    if (!storedAuthToken) {
      return errorResponse('Authorization token has expired or does not exist', 401);
    }

    if (storedAuthToken !== authToken) {
      return errorResponse('Invalid authorization token', 401);
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

    // Reset the user password
    await resetUserPassword(email, newPassword);

    // Remove the auth token after successful password reset
    await deleteAuthToken(email);

    return successResponse({ message: 'Password reset successfully' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return exceptionResponse(error);
  }
};
