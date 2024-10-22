/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Sentry from '@sentry/aws-serverless';

import awsImport from '../../secrets/awsImport.decrypted.json';
import { APIGatewayProxyHandler } from 'aws-lambda';

Sentry.init({
  dsn: awsImport.sentry.dsn,
  integrations: [Sentry.captureConsoleIntegration()],
});

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
) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

// Unified structure for an error response
export function errorResponse(message: string, statusCode: number = 400, headers: Record<string, string> = defaultHeaders) {
  return {
    statusCode,
    headers,
    body: JSON.stringify({
      error: message,
    }),
  };
}

export function wrapHandler(handler: APIGatewayProxyHandler): any {
  return Sentry.wrapHandler(async (event: any, context: any, callback: any) => {
    try {
      return await handler(event, context, callback);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return errorResponse('Bad request: malformed JSON', 400);
      } else {
        throw error;
      }
    }
  });
}
