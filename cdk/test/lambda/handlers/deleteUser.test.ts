import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../../../src/lambda/handlers/deleteUser';
import { getUserDetailsFromAccessToken, deleteUserFromCognito } from '../../../src/service/cognito';
import * as handlerUtil from '../../../src/lambda/handlerUtil';

jest.mock('../../../src/service/cognito');

describe('deleteUser', () => {
  const mockUserDetails = {
    username: 'testuser',
    email: 'test@sfu.ca',
  };

  const invokeHandler = async (event: Partial<APIGatewayProxyEvent>) => {
    const context = {} as Context;
    const callback = {} as Callback;
    const defaultEvent = {
      headers: {},
      queryStringParameters: {},
    };
    return handler({ ...defaultEvent, ...event } as APIGatewayProxyEvent, context, callback);
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (getUserDetailsFromAccessToken as jest.Mock).mockResolvedValue(mockUserDetails);
    (deleteUserFromCognito as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(handlerUtil, 'successResponse');
    jest.spyOn(handlerUtil, 'errorResponse');
  });

  it('should call errorResponse when authorization header is missing', async () => {
    await invokeHandler({});
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Authorization header is required', 401);
  });

  it('should call errorResponse when access token is invalid', async () => {
    (getUserDetailsFromAccessToken as jest.Mock).mockRejectedValue(new Error('Access token is invalid or has expired.'));
    await invokeHandler({
      headers: { Authorization: 'Bearer invalid_token' },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Invalid or expired access token', 401);
  });

  it('should delete user successfully with valid token', async () => {
    await invokeHandler({
      headers: { Authorization: 'Bearer valid_token' },
    });
    expect(getUserDetailsFromAccessToken).toHaveBeenCalledWith('valid_token');
    expect(deleteUserFromCognito).toHaveBeenCalledWith(mockUserDetails.username);
    expect(handlerUtil.successResponse).toHaveBeenCalledWith({
      message: 'User successfully deleted',
    });
  });

  it('should handle unexpected errors during deletion', async () => {
    (deleteUserFromCognito as jest.Mock).mockRejectedValue(new Error('Unexpected error'));
    await invokeHandler({
      headers: { Authorization: 'Bearer valid_token' },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Unexpected error', 500);
  });
});
