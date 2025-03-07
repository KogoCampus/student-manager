import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../../../src/lambda/handlers/emailVerificationComplete';
import { RedisClient } from '../../../src/service/redis';
import * as emailVerifiedToken from '../../../src/service/email/emailVerifiedToken';
import * as handlerUtil from '../../../src/lambda/handlerUtil';

jest.mock('../../../src/service/redis');
jest.mock('../../../src/service/email/emailVerifiedToken');

describe('emailVerificationComplete', () => {
  const mockRedis = {
    get: jest.fn(),
    delete: jest.fn(),
  };

  const mockEmailVerifiedToken = 'mock-email-verified-token';

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
    (RedisClient.getInstance as jest.Mock).mockReturnValue(mockRedis);
    (emailVerifiedToken.generateEmailVerifiedToken as jest.Mock).mockReturnValue(mockEmailVerifiedToken);
    jest.spyOn(handlerUtil, 'successResponse');
    jest.spyOn(handlerUtil, 'errorResponse');
  });

  it('should call errorResponse when email or verification code is missing', async () => {
    await invokeHandler({});
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Email and verification code are required', 400);
  });

  it('should call errorResponse when verification code is not found', async () => {
    mockRedis.get.mockResolvedValue(null);
    await invokeHandler({
      queryStringParameters: { email: 'test@sfu.ca', verificationCode: '123456' },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('No verification code found or it has expired', 400);
  });

  it('should call errorResponse when verification code is invalid', async () => {
    mockRedis.get.mockResolvedValue('654321');
    await invokeHandler({
      queryStringParameters: { email: 'test@sfu.ca', verificationCode: '123456' },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Invalid verification code', 401);
  });

  it('should complete verification successfully with valid code', async () => {
    const email = 'test@sfu.ca';
    const verificationCode = '123456';
    mockRedis.get.mockResolvedValue(verificationCode);

    await invokeHandler({
      queryStringParameters: { email, verificationCode },
    });

    expect(mockRedis.delete).toHaveBeenCalledWith(email);
    expect(emailVerifiedToken.storeEmailVerifiedToken).toHaveBeenCalledWith(email, mockEmailVerifiedToken);
    expect(handlerUtil.successResponse).toHaveBeenCalledWith({
      message: 'Email verified successfully.',
      emailVerifiedToken: mockEmailVerifiedToken,
    });
  });
});
