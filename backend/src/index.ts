import { buildApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';

const start = async () => {
  try {
    const app = await buildApp();
    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });
    logger.info(`MindVault Secure API running at http://localhost:${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
  } catch (err) {
    logger.error(err, 'Failed to start MindVault API server');
    process.exit(1);
  }
};

start();
