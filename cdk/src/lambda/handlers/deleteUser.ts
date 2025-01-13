import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse, wrapHandler } from '../handlerUtil';
import { getUserDetailsFromAccessToken } from '../../service/cognito';
import { deleteUserFromCognito } from '../../service/cognito';

const deleteUser: APIGatewayProxyHandler = async event => {
  try {
    // Get access token from Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return errorResponse('Authorization header is required', 401);
    }

    // Extract the token (remove "Bearer " if present)
    const accessToken = authHeader.replace(/^Bearer\s/, '');

    try {
      // Verify access token and get user details
      const userDetails = await getUserDetailsFromAccessToken(accessToken);
      // Delete user from Cognito
      await deleteUserFromCognito(userDetails.username);

      return successResponse({
        message: 'User successfully deleted',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Access token is invalid or has expired.') {
        return errorResponse('Invalid or expired access token', 401);
      }
      throw error;
    }
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Failed to delete user', 500);
  }
};

export const handler = wrapHandler(deleteUser);
