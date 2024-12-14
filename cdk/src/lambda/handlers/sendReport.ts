import { APIGatewayProxyHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { successResponse, errorResponse, wrapHandler } from '../handlerUtil';
import { settings } from '../../settings';
import { buildEmailParams } from '../../service/email';

// SES Client
const SES = new SESClient({ region: settings.ses.sesIdentityRegion });

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

    const emailParams = buildEmailParams('support@kogocampus.com', 'report', dynamicData, 'welcome@kogocampus.com');
    const command = new SendEmailCommand(emailParams);
    await SES.send(command);

    return successResponse({ message: 'Report sent successfully' });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Failed to send report', 500);
  }
};

export const handler = wrapHandler(sendReport);
