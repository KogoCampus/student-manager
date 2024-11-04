/* eslint-disable @typescript-eslint/no-explicit-any */
import { handlerImplementation as handler } from '../../src/lambda/resendVerification';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { RedisClient } from '../../src/lib/redis';
import { buildEmailParams } from '../../src/lib/emailService';
import { successResponse, errorResponse } from '../../src/lib/handlerUtil';

// Mock the external dependencies
jest.mock('@aws-sdk/client-ses');
jest.mock('../../src/lib/redis');
jest.mock('../../src/lib/emailService');
jest.mock('../../src/lib/handlerUtil');

describe('resendVerification handler', () => {
  const mockSend = jest.fn();
  const mockRedisInstance = {
    get: jest.fn(),
    setWithExpiry: jest.fn(),
  };

  beforeEach(() => {
    // Mock SESClient send method
    SESClient.prototype.send = mockSend;
    // Mock RedisClient getInstance and its methods
    (RedisClient.getInstance as jest.Mock).mockReturnValue(mockRedisInstance);
    // Mock the buildEmailParams function
    (buildEmailParams as jest.Mock).mockReturnValue({
      Destination: { ToAddresses: ['test@school.edu'] },
      Message: { Subject: { Data: 'Verification Code' }, Body: { Text: { Data: 'Your code is 123456' } } },
      Source: 'welcome@kogocampus.com',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if email is not provided', async () => {
    const event = { queryStringParameters: {} };
    const result = await handler(event as any, {} as any, jest.fn());
    expect(errorResponse).toHaveBeenCalledWith('Email query parameter is required', 400);
    expect(result).toBeUndefined(); // Mocked errorResponse handles the return
  });

  it('should return 429 if resend wait time has not passed', async () => {
    const event = { queryStringParameters: { email: 'test@school.edu' } };
    mockRedisInstance.get.mockResolvedValueOnce('wait'); // Simulate wait state still active
    const result = await handler(event as any, {} as any, jest.fn());
    expect(mockRedisInstance.get).toHaveBeenCalledWith('resend:test@school.edu');
    expect(errorResponse).toHaveBeenCalledWith('Please wait before requesting a new verification code', 429);
    expect(result).toBeUndefined();
  });

  it('should set the verification code and resend state in Redis, and send the email', async () => {
    const event = { queryStringParameters: { email: 'test@school.edu' } };
    mockRedisInstance.get.mockResolvedValueOnce(null); // Simulate no active resend wait state
    mockSend.mockResolvedValueOnce({}); // Mock SES send success

    const result = await handler(event as any, {} as any, jest.fn());
    expect(mockRedisInstance.setWithExpiry).toHaveBeenCalledWith('test@school.edu', expect.any(String), 900); // Verification code stored
    expect(mockRedisInstance.setWithExpiry).toHaveBeenCalledWith('resend:test@school.edu', 'wait', 30); // Resend state stored
    expect(mockSend).toHaveBeenCalledWith(expect.any(SendEmailCommand)); // Email sent
    expect(successResponse).toHaveBeenCalledWith({ message: 'Verification code resent successfully' });
    expect(result).toBeUndefined();
  });
});
