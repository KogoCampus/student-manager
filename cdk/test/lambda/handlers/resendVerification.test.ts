import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../../../src/lambda/handlers/resendVerification';
import { RedisClient } from '../../../src/service/redis';
import * as handlerUtil from '../../../src/lambda/handlerUtil';

jest.mock('../../../src/service/redis');
jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  SendEmailCommand: jest.fn(),
}));

describe('resendVerification', () => {
  const mockRedis = {
    get: jest.fn(),
    setWithExpiry: jest.fn(),
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
    (RedisClient.getInstance as jest.Mock).mockReturnValue(mockRedis);
    mockRedis.get.mockResolvedValue(null);
    jest.spyOn(handlerUtil, 'successResponse');
    jest.spyOn(handlerUtil, 'errorResponse');
  });

  it('should call errorResponse when email is missing', async () => {
    await invokeHandler({});
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Email query parameter is required', 400);
  });

  it('should call errorResponse when in cooldown period', async () => {
    mockRedis.get.mockResolvedValue('wait');
    await invokeHandler({
      queryStringParameters: { email: 'test@sfu.ca' },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Please wait before requesting a new verification code', 429);
  });

  it('should resend verification code successfully', async () => {
    const email = 'test@sfu.ca';
    await invokeHandler({
      queryStringParameters: { email },
    });

    expect(mockRedis.setWithExpiry).toHaveBeenCalledTimes(2);
    expect(mockRedis.setWithExpiry).toHaveBeenCalledWith(email, expect.any(String), 900);
    expect(mockRedis.setWithExpiry).toHaveBeenCalledWith(`resend:${email}`, 'wait', 30);
    expect(handlerUtil.successResponse).toHaveBeenCalledWith({ message: 'Verification code resent successfully' });
  });
});
