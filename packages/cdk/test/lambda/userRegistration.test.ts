/* eslint-disable @typescript-eslint/no-explicit-any */
import { handlerImplementation as handler } from '../../src/lambda/userRegistration';
import { RedisClient } from '../../src/utils/redis';
import { createUserInCognito, doesUserExistByEmail } from '../../src/utils/cognito';
import { successResponse, errorResponse } from '../../src/utils/handlerUtil';
import { getSchoolKeyByEmail } from '../../src/utils/schoolInfo';
import { getAuthToken, deleteAuthToken } from '../../src/utils/authToken';

// Mock the external dependencies
jest.mock('../../src/utils/redis');
jest.mock('../../src/utils/cognito');
jest.mock('../../src/utils/handlerUtil');
jest.mock('../../src/utils/schoolInfo');
jest.mock('../../src/utils/authToken');

// Mock context and callback
const mockContext = {} as any;
const mockCallback = jest.fn();

describe('userRegistration handler', () => {
  const mockRedisInstance = {
    get: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    // Mock RedisClient getInstance and its methods
    (RedisClient.getInstance as jest.Mock).mockReturnValue(mockRedisInstance);

    // Mock getSchoolKeyByEmail
    (getSchoolKeyByEmail as jest.Mock).mockReturnValue('school123');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if email or authToken is not provided', async () => {
    const event = { queryStringParameters: {} };
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('Email and authorization token are required', 400);
    expect(result).toBeUndefined(); // No direct return needed, response handled by mocks
  });

  it('should return 400 if username or password is not provided', async () => {
    const event = {
      queryStringParameters: { email: 'test@school.edu', authToken: 'auth_token' },
      body: JSON.stringify({ username: '' }),
    };
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('Username and password are required in the request body', 400);
    expect(result).toBeUndefined();
  });

  it('should return 401 if no authToken is found in Redis', async () => {
    const event = {
      queryStringParameters: { email: 'test@school.edu', authToken: 'auth_token' },
      body: JSON.stringify({ username: 'testuser', password: 'Password123!' }),
    };
    (getAuthToken as jest.Mock).mockResolvedValue(null); // Simulate no stored token in Redis
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('No authorization token found or it has expired', 401);
    expect(result).toBeUndefined();
  });

  it('should return 401 if the submitted authToken does not match the stored one', async () => {
    const event = {
      queryStringParameters: { email: 'test@school.edu', authToken: 'wrong_token' },
      body: JSON.stringify({ username: 'testuser', password: 'Password123!' }),
    };
    (getAuthToken as jest.Mock).mockResolvedValue('auth_token'); // Simulate stored token in Redis
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('Invalid authorization token', 401);
    expect(result).toBeUndefined();
  });

  it('should delete the authToken from Redis and create a new user in Cognito, returning tokens', async () => {
    const event = {
      queryStringParameters: { email: 'test@school.edu', authToken: 'auth_token' },
      body: JSON.stringify({ username: 'testuser', password: 'Password123!' }),
    };

    (getAuthToken as jest.Mock).mockResolvedValue('auth_token'); // Simulate matching token in Redis
    (createUserInCognito as jest.Mock).mockResolvedValue({
      AccessToken: 'access_token',
      IdToken: 'id_token',
      RefreshToken: 'refresh_token',
    });

    const result = await handler(event as any, mockContext, mockCallback);

    expect(deleteAuthToken).toHaveBeenCalledWith('test@school.edu');
    expect(createUserInCognito).toHaveBeenCalledWith('test@school.edu', 'testuser', 'Password123!', 'school123');
    expect(successResponse).toHaveBeenCalledWith({
      message: 'User successfully created',
      accessToken: 'access_token',
      idToken: 'id_token',
      refreshToken: 'refresh_token',
    });
    expect(result).toBeUndefined();
  });

  it('should return 409 if a user already exists with the provided email', async () => {
    const event = {
      queryStringParameters: { email: 'existing@school.edu', authToken: 'auth_token' },
      body: JSON.stringify({ username: 'existinguser', password: 'Password123!' }),
    };

    (getAuthToken as jest.Mock).mockResolvedValue('auth_token'); // Simulate matching token in Redis
    (createUserInCognito as jest.Mock).mockResolvedValue({
      AccessToken: 'access_token',
      IdToken: 'id_token',
      RefreshToken: 'refresh_token',
    });

    // Mock doesUserExistByEmail to return true
    (doesUserExistByEmail as jest.Mock).mockResolvedValue(true);

    const result = await handler(event as any, mockContext, mockCallback);

    expect(doesUserExistByEmail).toHaveBeenCalledWith('existing@school.edu');
    expect(errorResponse).toHaveBeenCalledWith('User already exists with the provided email', 409);
    expect(result).toBeUndefined();
  });
});
