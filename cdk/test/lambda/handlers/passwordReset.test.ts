import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../../../src/lambda/handlers/passwordReset';
import { doesUserExistByEmail, resetUserPassword } from '../../../src/service/cognito';
import { getEmailVerifiedToken, deleteEmailVerifiedToken } from '../../../src/service/email/emailVerifiedToken';
import * as handlerUtil from '../../../src/lambda/handlerUtil';

jest.mock('../../../src/service/cognito');
jest.mock('../../../src/service/email/emailVerifiedToken');

describe('passwordReset', () => {
  const mockStoredEmailVerifiedToken = 'stored-email-verified-token';
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
    (getEmailVerifiedToken as jest.Mock).mockResolvedValue(mockStoredEmailVerifiedToken);
    (doesUserExistByEmail as jest.Mock).mockResolvedValue(true);
    jest.spyOn(handlerUtil, 'successResponse');
    jest.spyOn(handlerUtil, 'errorResponse');
  });

  it('should call errorResponse when email or email verified token is missing', async () => {
    await invokeHandler({});
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Email and email verified token are required', 400);
  });

  it('should call errorResponse when email verified token is expired', async () => {
    (getEmailVerifiedToken as jest.Mock).mockResolvedValue(null);
    await invokeHandler({
      queryStringParameters: { email: mockEmail, emailVerifiedToken: 'some-token' },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Email verified token has expired or does not exist', 401);
  });

  it('should call errorResponse when email verified token is invalid', async () => {
    await invokeHandler({
      queryStringParameters: { email: mockEmail, emailVerifiedToken: 'wrong-token' },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Invalid email verified token', 401);
  });

  it('should call errorResponse when user does not exist', async () => {
    (doesUserExistByEmail as jest.Mock).mockResolvedValue(false);
    await invokeHandler({
      queryStringParameters: { email: mockEmail, emailVerifiedToken: mockStoredEmailVerifiedToken },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('User does not exist with the provided email', 404);
  });

  it('should call errorResponse when new password is missing', async () => {
    await invokeHandler({
      queryStringParameters: { email: mockEmail, emailVerifiedToken: mockStoredEmailVerifiedToken },
      body: JSON.stringify({}),
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('New password is required', 400);
  });

  it('should reset password successfully with valid inputs', async () => {
    await invokeHandler({
      queryStringParameters: { email: mockEmail, emailVerifiedToken: mockStoredEmailVerifiedToken },
      body: JSON.stringify({ newPassword: mockNewPassword }),
    });

    expect(resetUserPassword).toHaveBeenCalledWith(mockEmail, mockNewPassword);
    expect(deleteEmailVerifiedToken).toHaveBeenCalledWith(mockEmail);
    expect(handlerUtil.successResponse).toHaveBeenCalledWith({ message: 'Password reset successfully' });
  });
});
