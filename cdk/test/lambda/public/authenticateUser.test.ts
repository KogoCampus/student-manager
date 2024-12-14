/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../../../src/lambda/public/authenticateUser';
import { getUserDetailsFromAccessToken, refreshAccessToken } from '../../../src/service/cognito';
import { getSchoolInfoByEmail } from '../../../src/service/school';
import * as handlerUtil from '../../../src/lambda/handlerUtil';

// Mock the dependencies
jest.mock('../../../src/service/cognito');
jest.mock('../../../src/service/school');

describe('authenticateUser', () => {
  const mockUserDetails = {
    username: 'testuser',
    email: 'test@sfu.ca',
  };

  const mockSchoolInfo = {
    key: 'simon_fraser_university',
    data: {
      emailDomains: ['@sfu.ca'],
      name: 'Simon Fraser University',
      shortenedName: 'SFU',
    },
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
    (getUserDetailsFromAccessToken as jest.Mock).mockResolvedValue(mockUserDetails);
    (refreshAccessToken as jest.Mock).mockResolvedValue('new-access-token');
    (getSchoolInfoByEmail as jest.Mock).mockReturnValue(mockSchoolInfo);
    jest.spyOn(handlerUtil, 'successResponse');
    jest.spyOn(handlerUtil, 'errorResponse');
  });

  it('should call errorResponse when authorization header is missing', async () => {
    await invokeHandler({
      queryStringParameters: { grant_type: 'access_token' },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Authorization header is missing', 400);
  });

  it('should call errorResponse when grant_type is missing', async () => {
    await invokeHandler({
      headers: { Authorization: 'Bearer token123' },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('grant_type query parameter is required', 400);
  });

  it('should call errorResponse when grant_type is invalid', async () => {
    await invokeHandler({
      headers: { Authorization: 'Bearer token123' },
      queryStringParameters: { grant_type: 'invalid_type' },
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Invalid grant_type provided', 400);
  });

  it('should call successResponse with user data when authenticating with access_token', async () => {
    await invokeHandler({
      headers: { Authorization: 'Bearer token123' },
      queryStringParameters: { grant_type: 'access_token' },
    });
    expect(handlerUtil.successResponse).toHaveBeenCalledWith({
      userdata: {
        username: mockUserDetails.username,
        email: mockUserDetails.email,
        schoolKey: mockSchoolInfo.key,
        schoolData: mockSchoolInfo.data,
      },
    });
  });

  it('should call successResponse with refreshed token data', async () => {
    await invokeHandler({
      headers: { Authorization: 'Bearer refresh123' },
      queryStringParameters: { grant_type: 'refresh_token' },
    });
    expect(handlerUtil.successResponse).toHaveBeenCalledWith({
      userdata: {
        username: mockUserDetails.username,
        email: mockUserDetails.email,
        schoolKey: mockSchoolInfo.key,
        schoolData: mockSchoolInfo.data,
      },
      access_token: 'new-access-token',
      message: 'Access token refreshed successfully',
    });
  });
});
