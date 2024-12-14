import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse, wrapHandler } from '../handlerUtil';
import { authenticateUser } from '../../service/cognito';

const signIn: APIGatewayProxyHandler = async event => {
  try {
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
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Authentication failed', 500);
  }
};

export const handler = wrapHandler(signIn);
