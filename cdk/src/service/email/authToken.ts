import { RedisClient } from '../redis';

const AUTH_TOKEN_EXPIRATION_TIME = 3600; // 1 hour expiration for the auth token

/**
 * Generate a new auth token
 * @returns {string} A newly generated auth token
 */
export function generateAuthToken(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

/**
 * Store the auth token in Redis with an expiration time
 * @param {string} email The user's email
 * @param {string} authToken The auth token to store
 */
export async function storeAuthToken(email: string, authToken: string): Promise<void> {
  const redis = RedisClient.getInstance();
  await redis.setWithExpiry(`${email}-authToken`, authToken, AUTH_TOKEN_EXPIRATION_TIME);
}

/**
 * Retrieve the auth token from Redis for the given email
 * @param {string} email The user's email
 * @returns {Promise<string | null>} The auth token if it exists, null otherwise
 */
export async function getAuthToken(email: string): Promise<string | null> {
  const redis = RedisClient.getInstance();
  return await redis.get(`${email}-authToken`);
}

/**
 * Delete the auth token from Redis for the given email
 * @param {string} email The user's email
 */
export async function deleteAuthToken(email: string): Promise<void> {
  const redis = RedisClient.getInstance();
  await redis.delete(`${email}-authToken`);
}
