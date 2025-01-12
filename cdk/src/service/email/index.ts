import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { settings } from '../../settings';
import { buildEmailParams } from './emailTemplate';
// import { sendGmailEmail } from './gmail';

// Initialize SES Client
const SES = new SESClient({ region: settings.ses.sesIdentityRegion });

export interface SendEmailOptions {
  toEmail: string;
  useCase: string;
  dynamicData: Record<string, string>;
  sourceEmail?: string;
  schoolKey?: string; // Optional school key to determine email service
}

/**
 * Centralized function to send emails using SES
 * This allows us to add middleware, logging, or other functionality in one place
 */
export async function sendEmail({
  toEmail,
  useCase,
  dynamicData,
  sourceEmail = 'welcome@kogocampus.com',
}: SendEmailOptions): Promise<void> {
  const emailParams = buildEmailParams(toEmail, useCase, dynamicData, sourceEmail);

  // // Use Gmail for specific schools
  // if (schoolKey === 'sfu') { // Add more schools as needed
  //   const { Subject, Body } = emailParams.Message;
  //   await sendGmailEmail(toEmail, Subject.Data, Body.Text.Data, Body.Html.Data, sourceEmail);
  //   return;
  // }

  // Default to SES
  const command = new SendEmailCommand(emailParams);
  await SES.send(command);
}

export { buildEmailParams } from './emailTemplate';
