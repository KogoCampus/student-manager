/* eslint-disable @typescript-eslint/no-explicit-any */
import { handler } from '../../src/lambda/sendReport';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { successResponse, errorResponse, exceptionResponse } from '../../src/utils/lambdaResponse';
import { buildEmailParams } from '../../src/utils/sendEmail';

// Mock the external dependencies
jest.mock('@aws-sdk/client-ses');
jest.mock('../../src/utils/sendEmail');

const mockContext = {} as any;
const mockCallback = jest.fn();

describe('sendReport handler', () => {
    const mockSend = jest.fn();

    const mockEvent = {
      body: JSON.stringify({
        contentType: 'post',
        contentId: '123',
        reportDetails: 'Inappropriate content',
        reporterId: 'user123',
      }),
    };

    beforeEach(() => {
        // Mock SESClient send method
        SESClient.prototype.send = mockSend;
        // Mock the buildEmailParams function
        (buildEmailParams as jest.Mock).mockReturnValue({
            Destination: { ToAddresses: ['scott0929@gmail.com'] },
            Message: { Subject: { Data: 'Report' }, Body: { Text: { Data: 'Inappropriate content' } } },
            Source: 'welcome@kogocampus.com',
        });
      });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if required parameters are missing', async () => {
        const event = { body: JSON.stringify({}) };
        const result = await handler(event as any, mockContext, mockCallback);
        expect(result).toEqual(errorResponse('Missing required parameters', 400));
    });

    it('should send a report email successfully', async () => {
        mockSend.mockResolvedValueOnce({}); // Mock SES send command success
    
        const result = await handler(mockEvent as any, mockContext, mockCallback);
        expect(mockSend).toHaveBeenCalledWith(expect.any(SendEmailCommand));
        expect(buildEmailParams).toHaveBeenCalledWith('scott0929@gmail.com', 'report', expect.objectContaining({
          contentType: 'post',
          contentId: '123',
          reportDetails: 'Inappropriate content',
          reporterId: 'user123',
        }), 'welcome@kogocampus.com');
        expect(result).toEqual(successResponse({ message: 'Report sent successfully' }));

      });

      it('should return exception response on error', async () => {
        mockSend.mockRejectedValueOnce(new Error('SES error')); // Mock SES send command error
    
        const result = await handler(mockEvent as any, mockContext, mockCallback);
        expect(result).toEqual(exceptionResponse(new Error('SES error')));
      });
});