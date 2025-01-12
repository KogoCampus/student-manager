import { google } from 'googleapis';
import { settings } from '../../settings';

const { clientId, clientSecret } = settings.gmail;

// TODO: https://medium.com/@developervick/sending-mail-using-gmail-api-and-detailed-guide-to-google-apis-documentation-41c000706b50

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost');

// Initialize Gmail API
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

/**
 * Convert email parameters to MIME message
 */
function createMimeMessage(to: string, subject: string, textContent: string, htmlContent: string, from: string): string {
  const boundary = 'boundary_' + Math.random().toString(36).substring(2);
  const mimeMessage = [
    `From: ${from}`,
    `To: ${to}`,
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    `Content-Type: multipart/alternative; boundary=${boundary}`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    textContent,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlContent,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  return Buffer.from(mimeMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Send email using Gmail API
 */
export async function sendGmailEmail(to: string, subject: string, textContent: string, htmlContent: string, from: string): Promise<void> {
  try {
    const raw = createMimeMessage(to, subject, textContent, htmlContent, from);
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
      },
    });
  } catch (error) {
    console.error('Error sending email via Gmail:', error);
    throw error;
  }
}
