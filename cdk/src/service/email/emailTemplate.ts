import { SendEmailCommandInput } from '@aws-sdk/client-ses';
import emailTemplates from './emailTemplate.json';

/**
 * Utility function to build the email parameters for SES
 * @param toEmail - The recipient email address
 * @param useCase - The use case (e.g., verification, passwordReset, welcome)
 * @param dynamicData - The dynamic data to inject into the template (e.g., verificationCode)
 * @param sourceEmail - The sender email address (verified SES email)
 * @returns SendEmailCommandInput - The parameters for the SendEmailCommand
 */
export function buildEmailParams(
  toEmail: string,
  useCase: string,
  dynamicData: Record<string, string>,
  sourceEmail: string,
): SendEmailCommandInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedTemplate = (emailTemplates as { [key: string]: any })[useCase];

  if (!selectedTemplate) {
    throw new Error(`No email template found for use case: ${useCase}`);
  }

  // Replace dynamic fields in the subject, html, and text parts of the template
  const subject = selectedTemplate.Template.SubjectPart;
  const htmlBody = selectedTemplate.Template.HtmlPart;
  const textBody = selectedTemplate.Template.TextPart;

  const formattedSubject = replaceDynamicFields(subject, dynamicData);
  const formattedHtmlBody = replaceDynamicFields(htmlBody, dynamicData);
  const formattedTextBody = replaceDynamicFields(textBody, dynamicData);

  // Build email parameters
  return {
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: formattedHtmlBody,
        },
        Text: {
          Charset: 'UTF-8',
          Data: formattedTextBody,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: formattedSubject,
      },
    },
    Source: sourceEmail,
  };
}

/**
 * Helper function to replace dynamic fields in the template
 * @param templateStr - The template string containing placeholders (e.g., {{verificationCode}})
 * @param dynamicData - An object containing the dynamic data to replace (e.g., { verificationCode: '123456' })
 * @returns A string with the placeholders replaced by dynamic values
 */
function replaceDynamicFields(templateStr: string, dynamicData: Record<string, string>): string {
  return templateStr.replace(/{{(.*?)}}/g, (_, key) => dynamicData[key] || '');
}
