/* eslint-disable @typescript-eslint/no-explicit-any */
import { handler } from '../../src/lambda/passwordReset';
import { RedisClient } from '../../src/utils/redis';
import { resetUserPassword, doesUserExistByEmail } from '../../src/utils/cognito';
import { successResponse, errorResponse, exceptionResponse } from '../../src/utils/lambdaResponse';

// Mock external dependencies
jest.mock('../../src/utils/redis');
jest.mock('../../src/utils/cognito');
jest.mock('../../src/utils/lambdaResponse');

// Mock context and callback
const mockContext = {} as any;
const mockCallback = jest.fn();

describe('passwordReset handler', () => {
  const mockRedisInstance = {
    get: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    (RedisClient.getInstance as jest.Mock).mockReturnValue(mockRedisInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if email or verification code is missing', async () => {
    const event = { queryStringParameters: {} };
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('Email and verification code are required', 400);
    expect(result).toBeUndefined();
  });

  it('should return 400 if the verification code is invalid or expired', async () => {
    const event = { queryStringParameters: { email: 'test@school.edu', verificationCode: '123456' } };
    mockRedisInstance.get.mockResolvedValueOnce(null);
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('Verification code has expired or does not exist', 400);
    expect(result).toBeUndefined();
  });

  it('should return 404 if the user does not exist', async () => {
    const event = { queryStringParameters: { email: 'test@school.edu', verificationCode: '123456' } };
    mockRedisInstance.get.mockResolvedValueOnce('123456');
    (doesUserExistByEmail as jest.Mock).mockResolvedValueOnce(false);
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('User does not exist with the provided email', 404);
    expect(result).toBeUndefined();
  });

  it('should return 400 if the new password is missing', async () => {
    const event = {
      queryStringParameters: { email: 'test@school.edu', verificationCode: '123456' },
      body: JSON.stringify({}),
    };
    mockRedisInstance.get.mockResolvedValueOnce('123456');
    (doesUserExistByEmail as jest.Mock).mockResolvedValueOnce(true);
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('New password is required', 400);
    expect(result).toBeUndefined();
  });

  it('should reset the user password and clear the Redis code', async () => {
    const event = {
      queryStringParameters: { email: 'test@school.edu', verificationCode: '123456' },
      body: JSON.stringify({ newPassword: 'NewPassword123!' }),
    };
    mockRedisInstance.get.mockResolvedValueOnce('123456');
    (doesUserExistByEmail as jest.Mock).mockResolvedValueOnce(true);
    const result = await handler(event as any, mockContext, mockCallback);
    expect(resetUserPassword).toHaveBeenCalledWith('test@school.edu', 'NewPassword123!');
    expect(mockRedisInstance.delete).toHaveBeenCalledWith('test@school.edu');
    expect(successResponse).toHaveBeenCalledWith({ message: 'Password reset successfully' });
    expect(result).toBeUndefined();
  });

  it('should return exception response on error', async () => {
    const event = { queryStringParameters: { email: 'test@school.edu', verificationCode: '123456' } };
    mockRedisInstance.get.mockRejectedValueOnce(new Error('Redis error'));
    const result = await handler(event as any, mockContext, mockCallback);
    expect(exceptionResponse).toHaveBeenCalledWith(new Error('Redis error'));
    expect(result).toBeUndefined();
  });
});
