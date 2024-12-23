import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse, wrapHandler } from '../handlerUtil';
import { getEmailVerifiedToken, deleteEmailVerifiedToken } from '../../service/email/emailVerifiedToken';
import { createUserInCognito } from '../../service/cognito';

export const handler: APIGatewayProxyHandler = wrapHandler(async event => {
  const emailVerifiedToken = event.queryStringParameters?.emailVerifiedToken;

  if (!emailVerifiedToken) {
    return errorResponse('Email verified token is required', 400);
  }

  // Get email and password from the request body
  const requestBody = JSON.parse(event.body || '{}');
  const { email, password } = requestBody;

  // Check if email and password are provided
  if (!email || !password) {
    return errorResponse('Email and password are required in the request body', 400);
  }

  // Verify the email verified token after checking email and password
  const storedEmailVerifiedToken = await getEmailVerifiedToken(email);
  if (!storedEmailVerifiedToken) {
    return errorResponse('No email verified token found or it has expired', 401);
  }
  if (emailVerifiedToken !== storedEmailVerifiedToken) {
    return errorResponse('Invalid email verified token', 401);
  }

  // Proceed with user registration in Cognito
  const { AccessToken, IdToken, RefreshToken } = await createUserInCognito(email, password);

  // Upon successful registration, delete the email verified token from Redis
  await deleteEmailVerifiedToken(email);

  return successResponse({
    message: 'User successfully created',
    accessToken: AccessToken,
    idToken: IdToken,
    refreshToken: RefreshToken,
  });
});
