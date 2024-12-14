import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../../../src/lambda/handlers/emailVerification';
import { RedisClient } from '../../../src/service/redis';
import { isDesignatedSchoolEmail } from '../../../src/service/school';
import * as handlerUtil from '../../../src/lambda/handlerUtil';

jest.mock('../../../src/service/redis');
jest.mock('../../../src/service/school');
jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  SendEmailCommand: jest.fn(),
}));

describe('emailVerification', () => {
  const mockRedis = {
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
    (isDesignatedSchoolEmail as jest.Mock).mockReturnValue(true);
    jest.spyOn(handlerUtil, 'successResponse');
    jest.spyOn(handlerUtil, 'errorResponse');
  });

  it('should call errorResponse when email is missing', async () => {
    await invokeHandler({});
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Email query parameter is required', 400);
  });

  it('should call errorResponse when email is not from designated school', async () => {
    (isDesignatedSchoolEmail as jest.Mock).mockReturnValue(false);
    await invokeHandler({
      queryStringParameters: { email: 'test@example.com' },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Email is not from a designated school domain', 400);
  });

  it('should send verification email and store code in redis for valid email', async () => {
    await invokeHandler({
      queryStringParameters: { email: 'test@sfu.ca' },
    });
    expect(mockRedis.setWithExpiry).toHaveBeenCalled();
    expect(handlerUtil.successResponse).toHaveBeenCalledWith({ message: 'Verification email sent' });
  });
});
