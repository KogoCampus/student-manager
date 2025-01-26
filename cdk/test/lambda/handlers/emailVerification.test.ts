import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../../../src/lambda/handlers/emailVerification';
import { RedisClient } from '../../../src/service/redis';
import { isDesignatedSchoolEmail } from '../../../src/service/school';
import { doesUserExistByEmail } from '../../../src/service/cognito';
import * as handlerUtil from '../../../src/lambda/handlerUtil';
import * as emailService from '../../../src/service/email';

jest.mock('../../../src/service/redis');
jest.mock('../../../src/service/school');
jest.mock('../../../src/service/cognito');
jest.mock('../../../src/service/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

describe('emailVerification', () => {
  const mockRedis = {
    setWithExpiry: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    delete: jest.fn(),
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
    jest.spyOn(Math, 'random').mockReturnValue(0.123456);
    (RedisClient.getInstance as jest.Mock).mockReturnValue(mockRedis);
    (isDesignatedSchoolEmail as jest.Mock).mockReturnValue(true);
    (doesUserExistByEmail as jest.Mock).mockResolvedValue(false);
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

  it('should call errorResponse when user already exists', async () => {
    (doesUserExistByEmail as jest.Mock).mockResolvedValue(true);
    await invokeHandler({
      queryStringParameters: { email: 'test@sfu.ca' },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('User already exists with the provided email', 409);
  });

  it('should send verification email and store code in redis for valid email', async () => {
    const testEmail = 'test@sfu.ca';
    await invokeHandler({
      queryStringParameters: { email: testEmail },
    });

    // Verify code was stored in Redis
    expect(mockRedis.setWithExpiry).toHaveBeenCalled();

    // Verify email was sent with correct parameters
    expect(emailService.sendEmail).toHaveBeenCalledWith({
      toEmail: testEmail,
      useCase: 'verification',
      dynamicData: { verificationCode: '211110' },
    });
    expect(handlerUtil.successResponse).toHaveBeenCalledWith({ message: 'Verification email sent' });
  });

  it('should handle email sending errors gracefully', async () => {
    const error = new Error('Failed to send email');
    (emailService.sendEmail as jest.Mock).mockRejectedValueOnce(error);

    await invokeHandler({
      queryStringParameters: { email: 'test@sfu.ca' },
    });

    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Failed to send email', 500);
  });
});
