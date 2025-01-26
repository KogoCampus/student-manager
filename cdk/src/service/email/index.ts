// import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { buildEmailParams } from './emailTemplate';
import { sendGmailEmail } from './gmail';

// // Initialize SES Client
// const SES = new SESClient({ region: settings.ses.sesIdentityRegion });

export interface SendEmailOptions {
  toEmail: string;
  useCase: string;
  dynamicData: Record<string, string>;
  sourceEmail?: string;
}

/**
 * Centralized function to send emails using Gmail
 * This allows us to add middleware, logging, or other functionality in one place
 */
export async function sendEmail({
  toEmail,
  useCase,
  dynamicData,
  sourceEmail = 'welcome@kogocampus.com',
}: SendEmailOptions): Promise<void> {
  const emailParams = buildEmailParams(toEmail, useCase, dynamicData, sourceEmail);

  if (!emailParams.Message?.Subject?.Data || !emailParams.Message?.Body?.Text?.Data || !emailParams.Message?.Body?.Html?.Data) {
    throw new Error('Invalid email parameters: missing required fields');
  }

  await sendGmailEmail({
    to: toEmail,
    subject: emailParams.Message.Subject.Data,
    textContent: emailParams.Message.Body.Text.Data,
    htmlContent: emailParams.Message.Body.Html.Data,
  });

  // const command = new SendEmailCommand(emailParams);
  // await SES.send(command);
}

export { buildEmailParams } from './emailTemplate';
