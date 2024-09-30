import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse, exceptionResponse } from '../utils/lambdaResponse';
import { getUserDetailsFromAccessToken } from '../utils/cognito';
import { getSchoolInfoByKey } from '../utils/schoolInfo';

export const handler: APIGatewayProxyHandler = async event => {
  try {
    const authorizationHeader = event.headers.Authorization || event.headers.authorization;
    if (!authorizationHeader) {
      return errorResponse('Authorization header is missing', 400);
    }

    const accessToken = authorizationHeader.split(' ')[1];
    if (!accessToken) {
      return errorResponse('Access token is missing', 400);
    }

    const userDetails = await getUserDetailsFromAccessToken(accessToken);
    const schoolInfo = getSchoolInfoByKey(userDetails.schoolKey);

    return successResponse({
      username: userDetails.username,
      email: userDetails.email,
      schoolInfo: schoolInfo,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return exceptionResponse(error);
  }
};
