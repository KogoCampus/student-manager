import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse, exceptionResponse } from '../utils/lambdaResponse';
import { authenticateUser } from '../utils/cognito';

export const handler: APIGatewayProxyHandler = async event => {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return exceptionResponse(error);
  }
};
