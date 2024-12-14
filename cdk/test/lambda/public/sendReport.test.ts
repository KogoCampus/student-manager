/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../../../src/lambda/public/sendReport';
import * as handlerUtil from '../../../src/lambda/handlerUtil';

jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  SendEmailCommand: jest.fn(),
}));

describe('sendReport', () => {
  const mockReport = {
    contentType: 'post',
    contentId: '123',
    reportDetails: 'inappropriate content',
    reporterId: 'user123',
  };

  const invokeHandler = async (event: Partial<APIGatewayProxyEvent>) => {
    const context = {} as Context;
    const callback = {} as Callback;
    const defaultEvent = {
      headers: {},
      queryStringParameters: {},
      body: '{}',
    };
    return handler({ ...defaultEvent, ...event } as APIGatewayProxyEvent, context, callback);
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(handlerUtil, 'successResponse');
    jest.spyOn(handlerUtil, 'errorResponse');
  });

  it('should call errorResponse when required parameters are missing', async () => {
    await invokeHandler({});
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Missing required parameters', 400);
  });

  it('should call errorResponse when some parameters are missing', async () => {
    await invokeHandler({
      body: JSON.stringify({
        contentType: 'post',
        contentId: '123',
        // missing reportDetails and reporterId
      }),
    });
    expect(handlerUtil.errorResponse).toHaveBeenCalledWith('Missing required parameters', 400);
  });

  it('should send report successfully with valid parameters', async () => {
    await invokeHandler({
      body: JSON.stringify(mockReport),
    });
    expect(handlerUtil.successResponse).toHaveBeenCalledWith({ message: 'Report sent successfully' });
  });
});
