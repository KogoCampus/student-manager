import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse, wrapHandler } from '../handlerUtil';
import { getUserDetailsFromAccessToken, refreshAccessToken } from '../../service/cognito';
import { getSchoolInfoByEmail } from '../../service/school';

const authenticateUser: APIGatewayProxyHandler = async event => {
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

  try {
    switch (grantType) {
      case 'access_token': {
        const userDetails = await getUserDetailsFromAccessToken(token);
        const { key: schoolKey, data: schoolData } = getSchoolInfoByEmail(userDetails.email);

        return successResponse({
          userdata: {
            email: userDetails.email,
            schoolKey,
            schoolData,
          },
        });
      }
      case 'refresh_token': {
        const newAccessToken = await refreshAccessToken(token);
        const userDetails = await getUserDetailsFromAccessToken(newAccessToken);
        const { key: schoolKey, data: schoolData } = getSchoolInfoByEmail(userDetails.email);

        return successResponse({
          userdata: {
            email: userDetails.email,
            schoolKey,
            schoolData,
          },
          access_token: newAccessToken,
          message: 'Access token refreshed successfully',
        });
      }
      default:
        return errorResponse('Invalid grant_type provided', 400);
    }
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Authentication failed', 401);
  }
};

export const handler = wrapHandler(authenticateUser);
