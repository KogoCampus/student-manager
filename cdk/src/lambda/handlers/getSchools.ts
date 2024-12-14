import { APIGatewayProxyHandler } from 'aws-lambda';
import { wrapHandler, successResponse, errorResponse } from '../handlerUtil';
import { getAllSchools } from '../../service/school';

export const handler: APIGatewayProxyHandler = wrapHandler(async () => {
  try {
    const schoolListing = getAllSchools();

    // Transform the school listing into the desired format
    const schools = Object.entries(schoolListing).map(([key, data]) => ({
      key,
      ...data,
    }));

    return successResponse({ schools });
  } catch (error) {
    console.error('Failed to get schools:', error);
    return errorResponse('Internal server error', 500);
  }
});
