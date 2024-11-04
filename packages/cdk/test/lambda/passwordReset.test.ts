/* eslint-disable @typescript-eslint/no-explicit-any */
import { handlerImplementation as handler } from '../../src/lambda/passwordReset';
import { RedisClient } from '../../src/lib/redis';
import { resetUserPassword, doesUserExistByEmail } from '../../src/lib/cognito';
import { successResponse, errorResponse } from '../../src/lib/handlerUtil';
import { getAuthToken, deleteAuthToken } from '../../src/lib/authToken';

// Mock external dependencies
jest.mock('../../src/lib/redis');
jest.mock('../../src/lib/cognito');
jest.mock('../../src/lib/handlerUtil');
jest.mock('../../src/lib/authToken');

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

  it('should return 400 if email or authToken is missing', async () => {
    const event = { queryStringParameters: {} };
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('Email and authorization token are required', 400);
    expect(result).toBeUndefined();
  });

  it('should return 401 if the authToken is invalid or expired', async () => {
    const event = { queryStringParameters: { email: 'test@school.edu', authToken: 'invalid_token' } };
    (getAuthToken as jest.Mock).mockResolvedValueOnce(null); // Simulate missing or expired token
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('Authorization token has expired or does not exist', 401);
    expect(result).toBeUndefined();
  });

  it('should return 401 if the authToken does not match the stored one', async () => {
    const event = { queryStringParameters: { email: 'test@school.edu', authToken: 'wrong_token' } };
    (getAuthToken as jest.Mock).mockResolvedValueOnce('correct_token'); // Simulate different stored token
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('Invalid authorization token', 401);
    expect(result).toBeUndefined();
  });

  it('should return 404 if the user does not exist', async () => {
    const event = { queryStringParameters: { email: 'test@school.edu', authToken: 'correct_token' } };
    (getAuthToken as jest.Mock).mockResolvedValueOnce('correct_token'); // Simulate matching token
    (doesUserExistByEmail as jest.Mock).mockResolvedValueOnce(false); // Simulate user not existing
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('User does not exist with the provided email', 404);
    expect(result).toBeUndefined();
  });

  it('should return 400 if the new password is missing', async () => {
    const event = {
      queryStringParameters: { email: 'test@school.edu', authToken: 'correct_token' },
      body: JSON.stringify({}),
    };
    (getAuthToken as jest.Mock).mockResolvedValueOnce('correct_token'); // Simulate matching token
    (doesUserExistByEmail as jest.Mock).mockResolvedValueOnce(true); // Simulate user exists
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('New password is required', 400);
    expect(result).toBeUndefined();
  });

  it('should reset the user password and delete the authToken', async () => {
    const event = {
      queryStringParameters: { email: 'test@school.edu', authToken: 'correct_token' },
      body: JSON.stringify({ newPassword: 'NewPassword123!' }),
    };
    (getAuthToken as jest.Mock).mockResolvedValueOnce('correct_token'); // Simulate matching token
    (doesUserExistByEmail as jest.Mock).mockResolvedValueOnce(true); // Simulate user exists
    const result = await handler(event as any, mockContext, mockCallback);
    expect(resetUserPassword).toHaveBeenCalledWith('test@school.edu', 'NewPassword123!');
    expect(deleteAuthToken).toHaveBeenCalledWith('test@school.edu');
    expect(successResponse).toHaveBeenCalledWith({ message: 'Password reset successfully' });
    expect(result).toBeUndefined();
  });
});
