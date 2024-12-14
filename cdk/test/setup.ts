/* eslint-disable @typescript-eslint/no-explicit-any */

export const mockSettings = {
  environment: 'test',
  apigateway: {
    restApiId: 'test-api',
    rootResourceId: 'test-root',
  },
  cognito: {
    userPoolArn: 'test-pool-arn',
    userPoolId: 'test-pool-id',
    clientId: 'test-client',
  },
  ses: {
    sesIdentity: 'test.com',
    sesIdentityRegion: 'us-west-2',
    sesIdentityArn: 'test-ses-arn',
    sesConfigurationSetArn: 'test-ses-config',
  },
  vpc: {
    vpcId: 'test-vpc',
    vpcName: 'test-vpc-name',
    subnets: {
      private: {
        usWest2a: 'private-a',
        usWest2b: 'private-b',
        usWest2c: 'private-c',
      },
      public: {
        usWest2a: 'public-a',
        usWest2b: 'public-b',
        usWest2c: 'public-c',
      },
    },
  },
  sentry: {
    dsn: 'test-dsn',
    authToken: 'test-token',
  },
  internalApi: {
    auth: {
      name: 'test-name',
      password: 'test-pass',
    },
  },
};

// Mock the settings file
jest.mock('../../config/settings.decrypted.json', () => mockSettings, { virtual: true });
