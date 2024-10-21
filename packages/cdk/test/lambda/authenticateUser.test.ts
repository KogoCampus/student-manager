/* eslint-disable @typescript-eslint/no-explicit-any */
import { handler } from '../../src/lambda/authenticateUser';
import { getUserDetailsFromAccessToken, refreshAccessToken } from '../../src/utils/cognito';
import { getSchoolInfoByKey } from '../../src/utils/schoolInfo';
import { successResponse, errorResponse } from '../../src/utils/lambdaResponse';

// Mock the external dependencies
jest.mock('../../src/utils/cognito');
jest.mock('../../src/utils/schoolInfo');
jest.mock('../../src/utils/lambdaResponse');

// Mock context and callback
const mockContext = {} as any;
const mockCallback = jest.fn();

describe('authenticateUser handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if Authorization header is missing', async () => {
    const event = { headers: {} };
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('Authorization header is missing', 400);
    expect(result).toBeUndefined();
  });

  it('should return 400 if access token is missing', async () => {
    const event = { headers: { Authorization: 'Bearer ' }, queryStringParameters: { grant_type: 'access_token' } };
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('Token is missing', 400);
    expect(result).toBeUndefined();
  });

  it('should return 400 if grant_type is missing', async () => {
    const event = { headers: { Authorization: 'Bearer validAccessToken' } };
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('grant_type query parameter is required', 400);
    expect(result).toBeUndefined();
  });

  it('should return user details with schoolInfo when grant_type=access_token', async () => {
    const event = {
      headers: { Authorization: 'Bearer validAccessToken' },
      queryStringParameters: { grant_type: 'access_token' },
    };

    // Mock successful user details retrieval
    (getUserDetailsFromAccessToken as jest.Mock).mockResolvedValueOnce({
      username: 'testuser',
      email: 'test@school.edu',
      schoolKey: 'school123',
    });

    // Mock successful school info retrieval
    (getSchoolInfoByKey as jest.Mock).mockReturnValueOnce({
      domain: 'school.edu',
      name: 'Test School',
      shortenedName: 'TS',
    });

    const result = await handler(event as any, mockContext, mockCallback);

    expect(getUserDetailsFromAccessToken).toHaveBeenCalledWith('validAccessToken');
    expect(getSchoolInfoByKey).toHaveBeenCalledWith('school123');
    expect(successResponse).toHaveBeenCalledWith({
      userdata: {
        username: 'testuser',
        email: 'test@school.edu',
        schoolInfo: {
          domain: 'school.edu',
          name: 'Test School',
          shortenedName: 'TS',
        },
      },
    });
    expect(result).toBeUndefined();
  });

  it('should return user details and a new access token when grant_type=refresh_token', async () => {
    const event = {
      headers: { Authorization: 'Bearer validRefreshToken' },
      queryStringParameters: { grant_type: 'refresh_token' },
    };

    // Mock successful refresh token flow
    (refreshAccessToken as jest.Mock).mockResolvedValueOnce('newAccessToken');

    // Mock successful user details retrieval after refreshing token
    (getUserDetailsFromAccessToken as jest.Mock).mockResolvedValueOnce({
      username: 'testuser',
      email: 'test@school.edu',
      schoolKey: 'school123',
    });

    // Mock successful school info retrieval
    (getSchoolInfoByKey as jest.Mock).mockReturnValueOnce({
      domain: 'school.edu',
      name: 'Test School',
      shortenedName: 'TS',
    });

    const result = await handler(event as any, mockContext, mockCallback);

    expect(refreshAccessToken).toHaveBeenCalledWith('validRefreshToken');
    expect(getUserDetailsFromAccessToken).toHaveBeenCalledWith('newAccessToken');
    expect(successResponse).toHaveBeenCalledWith({
      userdata: {
        username: 'testuser',
        email: 'test@school.edu',
        schoolInfo: {
          domain: 'school.edu',
          name: 'Test School',
          shortenedName: 'TS',
        },
      },
      access_token: 'newAccessToken',
      message: 'Access token refreshed successfully',
    });
    expect(result).toBeUndefined();
  });

  it('should return error if grant_type is invalid', async () => {
    const event = {
      headers: { Authorization: 'Bearer validAccessToken' },
      queryStringParameters: { grant_type: 'invalid_grant_type' },
    };

    const result = await handler(event as any, mockContext, mockCallback);

    expect(errorResponse).toHaveBeenCalledWith('Invalid grant_type provided', 400);
    expect(result).toBeUndefined();
  });
});
