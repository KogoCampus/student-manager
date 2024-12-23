import { RedisClient } from '../redis';

const EMAIL_VERIFIED_TOKEN_EXPIRATION_TIME = 3600; // 1 hour expiration for the email verified token

/**
 * Generate a new email verified token
 * @returns {string} A newly generated email verified token
 */
export function generateEmailVerifiedToken(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

/**
 * Store the email verified token in Redis with an expiration time
 * @param {string} email The user's email
 * @param {string} emailVerifiedToken The email verified token to store
 */
export async function storeEmailVerifiedToken(email: string, emailVerifiedToken: string): Promise<void> {
  const redis = RedisClient.getInstance();
  await redis.setWithExpiry(`${email}-emailVerifiedToken`, emailVerifiedToken, EMAIL_VERIFIED_TOKEN_EXPIRATION_TIME);
}

/**
 * Retrieve the email verified token from Redis for the given email
 * @param {string} email The user's email
 * @returns {Promise<string | null>} The email verified token if it exists, null otherwise
 */
export async function getEmailVerifiedToken(email: string): Promise<string | null> {
  const redis = RedisClient.getInstance();
  return await redis.get(`${email}-emailVerifiedToken`);
}

/**
 * Delete the email verified token from Redis for the given email
 * @param {string} email The user's email
 */
export async function deleteEmailVerifiedToken(email: string): Promise<void> {
  const redis = RedisClient.getInstance();
  await redis.delete(`${email}-emailVerifiedToken`);
}
