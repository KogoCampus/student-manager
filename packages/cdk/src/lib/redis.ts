import * as redis from 'redis';

function getRedisPropertiesFromEnv() {
  const redisHost = process.env.REDIS_ENDPOINT || 'localhost';
  const redisPort = process.env.REDIS_PORT || '6379';
  return { redisHost, redisPort };
}

class RedisClient {
  private static instance: RedisClient | null = null;
  private client: redis.RedisClientType;

  private constructor(redisHost: string, redisPort: string) {
    this.client = redis.createClient({
      url: `redis://${redisHost}:${redisPort}`, // Use Redis host and port as arguments
      socket: {
        tls: false,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client.on('error', (err: any) => console.error('Redis Client Error', err));
    this.client.connect().catch(console.error); // Ensure connection on client creation
  }

  // Static method to get the singleton instance
  public static getInstance(): RedisClient {
    const { redisHost, redisPort } = getRedisPropertiesFromEnv();
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient(redisHost, redisPort);
    }
    return RedisClient.instance;
  }

  async setWithExpiry(key: string, value: string, ttl: number): Promise<void> {
    await this.client.setEx(key, ttl, value);
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async lpush(key: string, value: string): Promise<void> {
    await this.client.lPush(key, value); // Use lPush for the lpush command
  }

  async blpop(key: string, timeout: number): Promise<[string, string] | null> {
    const result = await this.client.blPop(key, timeout);
    if (!result) {
      return null;
    }
    return [result.key, result.element];
  }
}

export { RedisClient };
