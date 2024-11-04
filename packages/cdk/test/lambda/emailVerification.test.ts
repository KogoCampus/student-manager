/* eslint-disable @typescript-eslint/no-explicit-any */
import { handlerImplementation as handler } from '../../src/lambda/emailVerification';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { RedisClient } from '../../src/lib/redis';
import { buildEmailParams } from '../../src/lib/emailService';
import { successResponse, errorResponse } from '../../src/lib/handlerUtil';

// Mock the external dependencies
jest.mock('@aws-sdk/client-ses');
jest.mock('../../src/lib/redis');
jest.mock('../../src/lib/emailService');
// Mock the designatedSchools data to allow specific domains
jest.mock('../../src/constants/schoolListing.json', () => ({
  school1: { emailDomains: ['@school.edu'], fullName: 'School University', shortenedName: 'School' },
}));

// Mock context
const mockContext = {} as any;

// Mock callback (optional, only needed if your handler uses it)
const mockCallback = jest.fn();

describe('emailVerification handler', () => {
  const mockSend = jest.fn();
  const mockRedisInstance = {
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
      Message: { Subject: { Data: 'Subject' }, Body: { Text: { Data: 'Test body' } } },
      Source: 'welcome@kogocampus.com',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if email is not provided', async () => {
    const event = { queryStringParameters: {} };
    const result = await handler(event as any, mockContext, mockCallback);
    expect(result).toEqual(errorResponse('Email query parameter is required', 400));
  });

  it('should return 400 if email is not from a designated school', async () => {
    const event = { queryStringParameters: { email: 'test@random.com' } };
    const result = await handler(event as any, mockContext, mockCallback);
    expect(result).toEqual(errorResponse('Email is not from a designated school domain', 400));
  });

  it('should set the verification code in Redis and send an email', async () => {
    const event = { queryStringParameters: { email: 'test@school.edu' } };
    mockSend.mockResolvedValueOnce({}); // Mock SES send command
    const result = await handler(event as any, mockContext, mockCallback);
    expect(mockRedisInstance.setWithExpiry).toHaveBeenCalledWith('test@school.edu', expect.any(String), 900);

    expect(mockSend).toHaveBeenCalledWith(expect.any(SendEmailCommand));
    expect(result).toEqual(successResponse({ message: 'Verification email sent' }));
  });

  it('should throw an error on Redis error', async () => {
    const event = { queryStringParameters: { email: 'test@school.edu' } };
    mockRedisInstance.setWithExpiry.mockRejectedValueOnce(new Error('Redis error'));
    await expect(handler(event as any, mockContext, mockCallback)).rejects.toThrow('Redis error');
  });
});
