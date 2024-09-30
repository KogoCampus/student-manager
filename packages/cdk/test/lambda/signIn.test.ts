/* eslint-disable @typescript-eslint/no-explicit-any */
import { handler } from '../../src/lambda/signIn';
import { authenticateUser } from '../../src/utils/cognito';
import { successResponse, errorResponse, exceptionResponse } from '../../src/utils/lambdaResponse';

// Mock the external dependencies
jest.mock('../../src/utils/cognito');
jest.mock('../../src/utils/lambdaResponse');

// Mock context and callback
const mockContext = {} as any;
const mockCallback = jest.fn();

describe('signIn handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if username or password is not provided', async () => {
    const event = { body: JSON.stringify({ username: '', password: '' }) };
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('Username and password are required', 400);
    expect(result).toBeUndefined();
  });

  it('should return 401 if authenticateUser fails', async () => {
    const event = { body: JSON.stringify({ username: 'testuser', password: 'wrongpassword' }) };
    (authenticateUser as jest.Mock).mockResolvedValueOnce(null); // Simulate authentication failure

    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('Invalid username or password', 401);
    expect(result).toBeUndefined();
  });

  it('should return tokens if authentication is successful', async () => {
    const event = { body: JSON.stringify({ username: 'testuser', password: 'Password123!' }) };

    (authenticateUser as jest.Mock).mockResolvedValueOnce({
      AccessToken: 'access_token',
      IdToken: 'id_token',
      RefreshToken: 'refresh_token',
    });

    const result = await handler(event as any, mockContext, mockCallback);

    expect(authenticateUser).toHaveBeenCalledWith('testuser', 'Password123!');
    expect(successResponse).toHaveBeenCalledWith({
      message: 'User successfully authenticated',
      accessToken: 'access_token',
      idToken: 'id_token',
      refreshToken: 'refresh_token',
    });
    expect(result).toBeUndefined();
  });

  it('should return exception response on error', async () => {
    const event = { body: JSON.stringify({ username: 'testuser', password: 'Password123!' }) };
    (authenticateUser as jest.Mock).mockRejectedValueOnce(new Error('Cognito error'));

    const result = await handler(event as any, mockContext, mockCallback);
    expect(exceptionResponse).toHaveBeenCalledWith(new Error('Cognito error'));
    expect(result).toBeUndefined();
  });
});
