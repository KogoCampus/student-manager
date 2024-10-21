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

// function for handling exceptions. Should throw error if unhandled exception is thrown.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exceptionResponse(error: Error, statusCode: number = 500, headers: Record<string, string> = defaultHeaders): any {
  throw error;
  //return {
  //  statusCode,
  //  headers,
  //  body: JSON.stringify({
  //    error: 'An internal server error occurred.',
  //    details: error.message,
  //  }),
  //};
}
