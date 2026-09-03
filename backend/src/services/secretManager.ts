import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { config } from '../config';
import { logger } from '../utils/logger';

let client: SecretManagerServiceClient | null = null;
let cachedKey: string | null = null;

export const getGeminiKey = async (): Promise<string> => {
  // If memory cache exists, return it
  if (cachedKey) {
    return cachedKey;
  }

  // 1. Check local environment variable fallback first (e.g. for development/tests)
  if (config.geminiApiKey) {
    cachedKey = config.geminiApiKey;
    return cachedKey;
  }

  // 2. Otherwise fetch from GCP Secret Manager
  try {
    if (!client) {
      client = new SecretManagerServiceClient();
    }
    logger.info({ secret: config.geminiSecretName }, 'Fetching secret from Secret Manager');
    const [version] = await client.accessSecretVersion({
      name: config.geminiSecretName,
    });
    const payload = version.payload?.data?.toString();
    if (!payload) {
      throw new Error('Secret payload is empty');
    }
    cachedKey = payload;
    return payload;
  } catch (error) {
    logger.warn({ err: error }, 'Failed to access Secret Manager; checking process.env.GEMINI_API_KEY');
    if (process.env.GEMINI_API_KEY) {
      cachedKey = process.env.GEMINI_API_KEY;
      return cachedKey;
    }
    throw new Error('Failed to retrieve application AI credentials from Secret Manager or environment.');
  }
};
