/* eslint-disable @typescript-eslint/no-explicit-any */
import { handlerImplementation as handler } from '../../src/lambda/emailVerificationComplete';
import { RedisClient } from '../../src/lib/redis';
import { successResponse, errorResponse } from '../../src/lib/handlerUtil';
import { generateAuthToken, storeAuthToken } from '../../src/lib/authToken';

// Mock the external dependencies
jest.mock('../../src/lib/redis');
jest.mock('../../src/lib/handlerUtil');
jest.mock('../../src/lib/authToken');

// Mock context and callback
const mockContext = {} as any;
const mockCallback = jest.fn();

describe('verifyEmailComplete handler', () => {
  const mockRedisInstance = {
    get: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    // Mock RedisClient getInstance and its methods
    (RedisClient.getInstance as jest.Mock).mockReturnValue(mockRedisInstance);

    // Mock authToken utility methods
    (generateAuthToken as jest.Mock).mockReturnValue('auth_token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if email or verificationCode is not provided', async () => {
    const event = { queryStringParameters: {} };
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('Email and verification code are required', 400);
    expect(result).toBeUndefined();
  });

  it('should return 400 if no verification code is found in Redis', async () => {
    const event = {
      queryStringParameters: { email: 'test@school.edu', verificationCode: '123456' },
    };
    mockRedisInstance.get.mockResolvedValue(null); // Simulate no stored code in Redis
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('No verification code found or it has expired', 400);
    expect(result).toBeUndefined();
  });

  it('should return 401 if the submitted verification code does not match the stored one', async () => {
    const event = {
      queryStringParameters: { email: 'test@school.edu', verificationCode: 'wrongcode' },
    };
    mockRedisInstance.get.mockResolvedValue('123456'); // Simulate stored code in Redis
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('Invalid verification code', 401);
    expect(result).toBeUndefined();
  });

  it('should delete the verification code from Redis, generate auth token, and return success response', async () => {
    const event = {
      queryStringParameters: { email: 'test@school.edu', verificationCode: '123456' },
    };

    mockRedisInstance.get.mockResolvedValue('123456'); // Simulate matching code in Redis

    const result = await handler(event as any, mockContext, mockCallback);

    expect(mockRedisInstance.delete).toHaveBeenCalledWith('test@school.edu');
    expect(generateAuthToken).toHaveBeenCalled();
    expect(storeAuthToken).toHaveBeenCalledWith('test@school.edu', 'auth_token');
    expect(successResponse).toHaveBeenCalledWith({
      message: 'Email verified successfully.',
      authToken: 'auth_token',
    });
    expect(result).toBeUndefined();
  });
});
