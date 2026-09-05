import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const parseCorsOrigin = (): any => {
  if (process.env.CORS_ORIGIN) {
    if (process.env.CORS_ORIGIN === '*') return true;
    const split = process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
    return split.length === 1 ? split[0] : split;
  }
  return [
    'https://mindvault-39809.web.app',
    'https://mindvault-39809.firebaseapp.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
  ];
};

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'mindvault-39809',
  geminiSecretName:
    process.env.GEMINI_SECRET_NAME ||
    'projects/mindvault-39809/secrets/gemini-api-key/versions/latest',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  serviceAccountPath: path.resolve(__dirname, '../service-account.json'),
  corsOrigin: parseCorsOrigin(),
  redisUrl: process.env.REDIS_URL || '',
};
