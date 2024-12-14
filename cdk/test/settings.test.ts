/* eslint-disable @typescript-eslint/no-require-imports */
import { mockSettings } from './setup';

describe('Settings', () => {
  describe('Settings Loading', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('should load valid settings successfully', () => {
      const { settings } = require('../src/settings');
      expect(settings.environment).toBe(mockSettings.environment);
      expect(settings.apigateway.restApiId).toBe(mockSettings.apigateway.restApiId);
      expect(settings.cognito.userPoolId).toBe(mockSettings.cognito.userPoolId);
      expect(settings.vpc.subnets.private.usWest2a).toBe(mockSettings.vpc.subnets.private.usWest2a);
    });

    it('should throw error if settings are invalid', () => {
      jest.mock('../../config/settings.decrypted.json', () => ({
        environment: 'test',
        // Missing all other required fields
      }));

      expect(() => {
        jest.isolateModules(() => {
          require('../src/settings');
        });
      }).toThrow('Failed to load settings');
    });
  });
});
