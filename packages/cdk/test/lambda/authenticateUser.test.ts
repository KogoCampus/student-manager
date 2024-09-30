/* eslint-disable @typescript-eslint/no-explicit-any */
import { handler } from '../../src/lambda/authenticateUser';
import { getUserDetailsFromAccessToken } from '../../src/utils/cognito';
import { getSchoolInfoByKey } from '../../src/utils/schoolInfo';
import { successResponse, errorResponse, exceptionResponse } from '../../src/utils/lambdaResponse';

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
    const event = { headers: { Authorization: 'Bearer ' } };
    const result = await handler(event as any, mockContext, mockCallback);
    expect(errorResponse).toHaveBeenCalledWith('Access token is missing', 400);
    expect(result).toBeUndefined();
  });

  it('should return user details and full schoolInfo if authentication is successful', async () => {
    const event = {
      headers: { Authorization: 'Bearer validAccessToken' },
    };
    (getUserDetailsFromAccessToken as jest.Mock).mockResolvedValueOnce({
      username: 'testuser',
      email: 'test@school.edu',
      schoolKey: 'school123',
    });
    (getSchoolInfoByKey as jest.Mock).mockReturnValueOnce({
      domain: 'school.edu',
      name: 'Test School',
      shortenedName: 'TS',
    });

    const result = await handler(event as any, mockContext, mockCallback);
    expect(getUserDetailsFromAccessToken).toHaveBeenCalledWith('validAccessToken');
    expect(getSchoolInfoByKey).toHaveBeenCalledWith('school123');
    expect(successResponse).toHaveBeenCalledWith({
      username: 'testuser',
      email: 'test@school.edu',
      schoolInfo: {
        domain: 'school.edu',
        name: 'Test School',
        shortenedName: 'TS',
      },
    });
    expect(result).toBeUndefined();
  });

  it('should return exception response on error', async () => {
    const event = {
      headers: { Authorization: 'Bearer validAccessToken' },
    };
    (getUserDetailsFromAccessToken as jest.Mock).mockRejectedValueOnce(new Error('Cognito error'));

    const result = await handler(event as any, mockContext, mockCallback);
    expect(exceptionResponse).toHaveBeenCalledWith(new Error('Cognito error'));
    expect(result).toBeUndefined();
  });
});
