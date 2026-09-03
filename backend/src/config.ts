import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'mindvault-local',
  geminiSecretName:
    process.env.GEMINI_SECRET_NAME ||
    'projects/mindvault-local/secrets/gemini-api-key/versions/latest',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  serviceAccountPath: path.resolve(__dirname, '../service-account.json'),
  corsOrigin:
    process.env.CORS_ORIGIN ||
    (process.env.NODE_ENV === 'production'
      ? 'https://your-production-domain.com'
      : 'http://localhost:5173'),
};
