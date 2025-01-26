import { google } from 'googleapis';
import { settings } from '../../settings';
import { RedisClient } from '../redis';
import { Credentials } from 'google-auth-library';

const { clientId, clientSecret, credentials } = settings.gmail;
const GMAIL_ACCESS_TOKEN_KEY = 'gmail_access_token';
const TOKEN_EXPIRY_KEY = 'gmail_token_expiry';

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:4000/oauth2callback');

// Set initial credentials if available
if (credentials) {
  oauth2Client.setCredentials(credentials);
}

interface SendGmailOptions {
  to: string;
  subject: string;
  textContent: string;
  htmlContent: string;
}

/**
 * Get a valid access token, using Redis cache if available
 */
async function getValidAccessToken(): Promise<string> {
  const redis = RedisClient.getInstance();
  const [cachedToken, cachedExpiry] = await Promise.all([redis.get(GMAIL_ACCESS_TOKEN_KEY), redis.get(TOKEN_EXPIRY_KEY)]);

  // If we have a valid cached token, use it
  if (cachedToken && cachedExpiry) {
    const expiryTime = parseInt(cachedExpiry);
    if (Date.now() < expiryTime) {
      return cachedToken;
    }
  }

  // If no valid cached token, check settings credentials
  if (!credentials?.refresh_token) {
    throw new Error('Gmail credentials not found. Please run the gmail-auth script first.');
  }

  try {
    // Get new access token using refresh token
    const response = await oauth2Client.refreshToken(credentials.refresh_token);
    const newCredentials: Credentials = response.tokens;

    if (!newCredentials?.access_token) {
      throw new Error('Failed to get access token from refresh token');
    }

    // Calculate expiry if not provided (default to 1 hour)
    const expiryDate = newCredentials.expiry_date || Date.now() + 3600000;

    // Cache the new token in Redis
    await Promise.all([
      redis.setWithExpiry(GMAIL_ACCESS_TOKEN_KEY, newCredentials.access_token, 3600), // 1 hour
      redis.setWithExpiry(TOKEN_EXPIRY_KEY, expiryDate.toString(), 3600),
    ]);

    return newCredentials.access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to refresh access token: ${error.message}`);
    }
    throw new Error('Failed to refresh access token: Unknown error');
  }
}

/**
 * Convert email parameters to MIME message
 */
function createMimeMessage({ to, subject, textContent, htmlContent }: SendGmailOptions): string {
  const message = [
    `From: Kogo Campus <welcometokogo@gmail.com>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="boundary"',
    '',
    '--boundary',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    textContent.trim(),
    '',
    '--boundary',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlContent.trim(),
    '',
    '--boundary--',
  ].join('\r\n');

  return Buffer.from(message).toString('base64url');
}

/**
 * Send email using Gmail API
 */
export async function sendGmailEmail(options: SendGmailOptions): Promise<void> {
  try {
    // Get valid access token (from Redis or refresh if needed)
    const accessToken = await getValidAccessToken();
    oauth2Client.setCredentials({ access_token: accessToken });

    // Create Gmail client
    const gmail = google.gmail({
      version: 'v1',
      auth: oauth2Client,
    });

    const raw = createMimeMessage(options);

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });
  } catch (error) {
    console.error('Error sending email via Gmail:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to send Gmail: ${error.message}`);
    }
    throw new Error('Failed to send Gmail: Unknown error');
  }
}
