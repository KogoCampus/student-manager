/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../../../src/lambda/public/signIn';
import { authenticateUser } from '../../../src/service/cognito';
import * as handlerUtil from '../../../src/lambda/handlerUtil';

jest.mock('../../../src/service/cognito');

describe('signIn', () => {
  const mockAuthResult = {
    AccessToken: 'access-token',
    IdToken: 'id-token',
    RefreshToken: 'refresh-token',
  };

  const invokeHandler = async (event: Partial<APIGatewayProxyEvent>) => {
    const context = {} as Context;
    const callback = {} as Callback;
    const defaultEvent = {
      headers: {},
      queryStringParameters: {},
      body: '{}',
    };
    return handler({ ...defaultEvent, ...event } as APIGatewayProxyEvent, context, callback);
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (authenticateUser as jest.Mock).mockResolvedValue(mockAuthResult);
    jest.spyOn(handlerUtil, 'successResponse');
    jest.spyOn(handlerUtil, 'errorResponse');
  });

  it('should call errorResponse when username or password is missing', async () => {
    await invokeHandler({});
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Username and password are required', 400);
  });

  it('should call errorResponse when authentication fails', async () => {
    (authenticateUser as jest.Mock).mockResolvedValue(null);
    await invokeHandler({
      body: JSON.stringify({ username: 'user', password: 'pass' }),
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Invalid username or password', 401);
  });

  it('should authenticate successfully with valid credentials', async () => {
    await invokeHandler({
      body: JSON.stringify({ username: 'user', password: 'pass' }),
    });
    expect(authenticateUser).toHaveBeenCalledWith('user', 'pass');
    expect(handlerUtil.successResponse).toHaveBeenCalledWith({
      message: 'User successfully authenticated',
      accessToken: mockAuthResult.AccessToken,
      idToken: mockAuthResult.IdToken,
      refreshToken: mockAuthResult.RefreshToken,
    });
  });
});
