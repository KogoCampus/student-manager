import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../../../src/lambda/handlers/passwordReset';
import { doesUserExistByEmail, resetUserPassword } from '../../../src/service/cognito';
import { getAuthToken, deleteAuthToken } from '../../../src/service/email/authToken';
import * as handlerUtil from '../../../src/lambda/handlerUtil';

jest.mock('../../../src/service/cognito');
jest.mock('../../../src/service/email/authToken');

describe('passwordReset', () => {
  const mockStoredAuthToken = 'stored-auth-token';
  const mockEmail = 'test@sfu.ca';
  const mockNewPassword = 'newPassword123';

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
    (getAuthToken as jest.Mock).mockResolvedValue(mockStoredAuthToken);
    (doesUserExistByEmail as jest.Mock).mockResolvedValue(true);
    jest.spyOn(handlerUtil, 'successResponse');
    jest.spyOn(handlerUtil, 'errorResponse');
  });

  it('should call errorResponse when email or auth token is missing', async () => {
    await invokeHandler({});
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Email and authorization token are required', 400);
  });

  it('should call errorResponse when auth token is expired', async () => {
    (getAuthToken as jest.Mock).mockResolvedValue(null);
    await invokeHandler({
      queryStringParameters: { email: mockEmail, authToken: 'some-token' },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Authorization token has expired or does not exist', 401);
  });

  it('should call errorResponse when auth token is invalid', async () => {
    await invokeHandler({
      queryStringParameters: { email: mockEmail, authToken: 'wrong-token' },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Invalid authorization token', 401);
  });

  it('should call errorResponse when user does not exist', async () => {
    (doesUserExistByEmail as jest.Mock).mockResolvedValue(false);
    await invokeHandler({
      queryStringParameters: { email: mockEmail, authToken: mockStoredAuthToken },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('User does not exist with the provided email', 404);
  });

  it('should call errorResponse when new password is missing', async () => {
    await invokeHandler({
      queryStringParameters: { email: mockEmail, authToken: mockStoredAuthToken },
      body: JSON.stringify({}),
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('New password is required', 400);
  });

  it('should reset password successfully with valid inputs', async () => {
    await invokeHandler({
      queryStringParameters: { email: mockEmail, authToken: mockStoredAuthToken },
      body: JSON.stringify({ newPassword: mockNewPassword }),
    });

    expect(resetUserPassword).toHaveBeenCalledWith(mockEmail, mockNewPassword);
    expect(deleteAuthToken).toHaveBeenCalledWith(mockEmail);
    expect(handlerUtil.successResponse).toHaveBeenCalledWith({ message: 'Password reset successfully' });
  });
});
