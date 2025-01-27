/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Sentry from '@sentry/aws-serverless';
import { settings } from '../settings';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { RedisClient } from '../service/redis';

export interface HandlerOptions {
  rateLimit?: {
    enabled: boolean;
    cooldownSeconds: number;
    // eslint-disable-next-line no-unused-vars
    keyGenerator?: (event: any) => string;
  };
}

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
  console.log('errorResponse', message, statusCode, headers);
  return {
    statusCode,
    headers,
    body: JSON.stringify({
      error: message,
    }),
  };
}

/**
 * Check if the request should be rate limited
 * @returns true if request is allowed, false if it should be rate limited
 */
async function checkRateLimit(event: any, options: HandlerOptions): Promise<boolean> {
  if (!options.rateLimit?.enabled) {
    return true;
  }

  const redis = RedisClient.getInstance();
  const keyGenerator = options.rateLimit.keyGenerator || (e => e.queryStringParameters?.email || e.requestContext.identity.sourceIp);

  const key = keyGenerator(event);
  if (!key) {
    return true;
  }

  const rateLimitKey = `rate_limit:${key}`;
  const isRateLimited = await redis.get(rateLimitKey);

  if (isRateLimited) {
    return false;
  }

  await redis.setWithExpiry(rateLimitKey, '1', options.rateLimit.cooldownSeconds);
  return true;
}

// Base handler wrapper with error handling and rate limiting
const baseWrapper =
  (handler: APIGatewayProxyHandler, options?: HandlerOptions): APIGatewayProxyHandler =>
  async (event, context, callback) => {
    try {
      // Rate limiting check
      if (options && !(await checkRateLimit(event, options))) {
        return errorResponse('Too many requests. Please try again later.', 429, {
          ...defaultHeaders,
          'Retry-After': (options.rateLimit?.cooldownSeconds || 15).toString(),
        });
      }

      const response = await handler(event, context, callback);
      return response || errorResponse('No response from handler');
    } catch (error) {
      if (error instanceof SyntaxError) {
        return errorResponse('Bad request: malformed JSON', 400);
      }
      throw error;
    }
  };

export function wrapHandler(handler: APIGatewayProxyHandler, options?: HandlerOptions): APIGatewayProxyHandler {
  const wrappedHandler = baseWrapper(handler, options);
  return settings.environment === 'production' ? (Sentry.wrapHandler(wrappedHandler) as any) : wrappedHandler;
}
