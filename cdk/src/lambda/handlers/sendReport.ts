import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse, wrapHandler } from '../handlerUtil';
import { sendEmail } from '../../service/email';

const sendReport: APIGatewayProxyHandler = async event => {
  try {
    const { contentType, contentId, reportDetails, reporterId } = JSON.parse(event.body || '{}');

    if (!contentType || !contentId || !reportDetails || !reporterId) {
      return errorResponse('Missing required parameters', 400);
    }

    const dynamicData = {
      contentType,
      contentId,
      reportDetails,
      reporterId,
    };

    await sendEmail({
      toEmail: 'support@kogocampus.com',
      useCase: 'report',
      dynamicData,
    });

    return successResponse({ message: 'Report sent successfully' });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Failed to send report', 500);
  }
};

export const handler = wrapHandler(sendReport);
