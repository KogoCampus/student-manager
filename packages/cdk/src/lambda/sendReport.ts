import { APIGatewayProxyHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { successResponse, errorResponse, exceptionResponse } from '../utils/lambdaResponse';
import awsImport from '../../secrets/awsImport.decrypted.json';
import { buildEmailParams } from '../utils/sendEmail';

// SES Client
const SES = new SESClient({ region: awsImport.ses.sesIdentityRegion });

export const handler: APIGatewayProxyHandler = async event => {
  try {
    const { contentType, contentId, reportDetails, reporter } = JSON.parse(event.body || '{}');

    if (!contentType || !contentId || !reportDetails || !reporter) {
      return errorResponse('Missing required parameters', 400);
    }

    const dynamicData = {
      contentType,
      contentId,
      reportDetails,
      reporter,
    };

    const emailParams = buildEmailParams('scott0929@gmail.com', 'report', dynamicData, 'welcome@kogocampus.com');

    const command = new SendEmailCommand(emailParams);
    await SES.send(command);

    return successResponse({ message: 'Report sent successfully' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return exceptionResponse(error);
  }
};