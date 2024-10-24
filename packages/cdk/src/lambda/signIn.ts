import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse, wrapHandler } from '../utils/handlerUtil';
import { authenticateUser } from '../utils/cognito';

export const handlerImplementation: APIGatewayProxyHandler = async event => {
  const requestBody = JSON.parse(event.body || '{}');
  const { username, password } = requestBody;
  if (!username || !password) {
    return errorResponse('Username and password are required', 400);
  }

  const authResult = await authenticateUser(username, password);
  if (!authResult) {
    return errorResponse('Invalid username or password', 401);
  }

  const { AccessToken, IdToken, RefreshToken } = authResult;

  return successResponse({
    message: 'User successfully authenticated',
    accessToken: AccessToken,
    idToken: IdToken,
    refreshToken: RefreshToken,
  });
};

export const handler: APIGatewayProxyHandler = wrapHandler(handlerImplementation);
