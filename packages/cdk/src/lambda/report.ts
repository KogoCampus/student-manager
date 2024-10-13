import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse, exceptionResponse } from '../utils/lambdaResponse';


export const handler: APIGatewayProxyHandler = async event => {
  try {
    return successResponse({ message: 'Hello, world!' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return exceptionResponse(error);
  }
};