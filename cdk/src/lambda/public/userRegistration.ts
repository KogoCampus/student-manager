import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse, wrapHandler } from '../handlerUtil';
import { getAuthToken, deleteAuthToken } from '../../service/email/authToken';
import { createUserInCognito, doesUserExistByEmail } from '../../service/cognito';

export const handler: APIGatewayProxyHandler = wrapHandler(async event => {
  const email = event.queryStringParameters?.email;
  const authToken = event.queryStringParameters?.authToken;

  if (!email || !authToken) {
    return errorResponse('Email and authorization token are required', 400);
  }

  // Get username and password from the request body
  const requestBody = JSON.parse(event.body || '{}');
  const { username, password } = requestBody;
  // Check if username and password are provided
  if (!username || !password) {
    return errorResponse('Username and password are required in the request body', 400);
  }

  // Verify the auth token after checking username and password
  const storedAuthToken = await getAuthToken(email);
  if (!storedAuthToken) {
    return errorResponse('No authorization token found or it has expired', 401);
  }
  if (authToken !== storedAuthToken) {
    return errorResponse('Invalid authorization token', 401);
  }

  // Check if a user with the same email already exists
  const doesUserExist = await doesUserExistByEmail(email);
  if (doesUserExist) {
    return errorResponse('User already exists with the provided email', 409);
  }

  // Proceed with user registration in Cognito
  const { AccessToken, IdToken, RefreshToken } = await createUserInCognito(email, username, password);

  // Upon successful registration, delete the auth token from Redis
  await deleteAuthToken(email);

  return successResponse({
    message: 'User successfully created',
    accessToken: AccessToken,
    idToken: IdToken,
    refreshToken: RefreshToken,
  });
});
