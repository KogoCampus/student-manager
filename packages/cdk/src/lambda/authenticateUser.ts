import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse, exceptionResponse } from '../utils/lambdaResponse';
import { getUserDetailsFromAccessToken, refreshAccessToken } from '../utils/cognito';
import { getSchoolInfoByKey } from '../utils/schoolInfo';

export const handler: APIGatewayProxyHandler = async event => {
  try {
    const authorizationHeader = event.headers.Authorization || event.headers.authorization;
    const grantType = event.queryStringParameters?.grant_type;

    if (!authorizationHeader) {
      return errorResponse('Authorization header is missing', 400);
    }
    if (!grantType) {
      return errorResponse('grant_type query parameter is required', 400);
    }

    const token = authorizationHeader.split(' ')[1];
    if (!token) {
      return errorResponse('Token is missing', 400);
    }

    switch (grantType) {
      case 'access_token': {
        const userDetails = await getUserDetailsFromAccessToken(token);
        const schoolKey = userDetails.schoolKey;
        const schoolInfo = getSchoolInfoByKey(schoolKey);

        return successResponse({
          userdata: {
            username: userDetails.username,
            email: userDetails.email,
            schoolInfo: schoolInfo || 'School information not found',
          },
        });
      }
      case 'refresh_token': {
        const newAccessToken = await refreshAccessToken(token);
        const userDetails = await getUserDetailsFromAccessToken(newAccessToken); // Fetching user details again for consistency
        const schoolKey = userDetails.schoolKey;
        const schoolInfo = getSchoolInfoByKey(schoolKey);

        return successResponse({
          userdata: {
            username: userDetails.username,
            email: userDetails.email,
            schoolInfo: schoolInfo || 'School information not found',
          },
          access_token: newAccessToken,
          message: 'Access token refreshed successfully',
        });
      }
      default:
        return errorResponse('Invalid grant_type provided', 400);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return exceptionResponse(error);
  }
};
