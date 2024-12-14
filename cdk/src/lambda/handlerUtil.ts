/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Sentry from '@sentry/aws-serverless';
import { settings } from '../settings';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';

// Only initialize Sentry in production
if (settings.environment === 'production') {
  Sentry.init({
    dsn: settings.sentry.dsn,
    integrations: [Sentry.captureConsoleIntegration()],
    environment: 'production',
  });
}

// Standard headers for Lambda responses
const defaultHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*', // Enable CORS for all origins
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
};

// Unified structure for a successful response
export function successResponse(
  body: Record<string, unknown> | string,
  statusCode: number = 200,
  headers: Record<string, string> = defaultHeaders,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

// Unified structure for an error response
export function errorResponse(
  message: string,
  statusCode: number = 400,
  headers: Record<string, string> = defaultHeaders,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers,
    body: JSON.stringify({
      error: message,
    }),
  };
}

// Base handler wrapper with error handling
const baseWrapper =
  (handler: APIGatewayProxyHandler): APIGatewayProxyHandler =>
  async (event, context, callback) => {
    try {
      const response = await handler(event, context, callback);
      return response || errorResponse('No response from handler');
    } catch (error) {
      if (error instanceof SyntaxError) {
        return errorResponse('Bad request: malformed JSON', 400);
      }
      throw error;
    }
  };

export function wrapHandler(handler: APIGatewayProxyHandler): APIGatewayProxyHandler {
  const wrappedHandler = baseWrapper(handler);
  return settings.environment === 'production' ? (Sentry.wrapHandler(wrappedHandler) as any) : wrappedHandler;
}
