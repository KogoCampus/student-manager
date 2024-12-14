import { z } from 'zod';
import settingsJson from '../../config/settings.decrypted.json';

const SubnetConfigSchema = z.object({
  usWest2a: z.string(),
  usWest2b: z.string(),
  usWest2c: z.string(),
});

const VpcSubnetsSchema = z.object({
  private: SubnetConfigSchema,
  public: SubnetConfigSchema,
});

export const SettingsSchema = z.object({
  environment: z.string(),
  apigateway: z.object({
    restApiId: z.string(),
    rootResourceId: z.string(),
  }),
  cognito: z.object({
    userPoolArn: z.string(),
    userPoolId: z.string(),
    clientId: z.string(),
  }),
  ses: z.object({
    sesIdentity: z.string(),
    sesIdentityRegion: z.string(),
    sesIdentityArn: z.string(),
    sesConfigurationSetArn: z.string(),
  }),
  vpc: z.object({
    vpcId: z.string(),
    vpcName: z.string(),
    subnets: VpcSubnetsSchema,
  }),
  sentry: z.object({
    dsn: z.string(),
    authToken: z.string(),
  }),
});

type Settings = z.infer<typeof SettingsSchema>;

function loadSettings(): Settings {
  try {
    return SettingsSchema.parse(settingsJson);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load settings: ${error.message}`);
    }
    throw error;
  }
}

export type { Settings };
export const settings = loadSettings();
