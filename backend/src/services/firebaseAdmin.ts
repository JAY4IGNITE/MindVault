import * as admin from 'firebase-admin';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';

if (!admin.apps.length) {
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    admin.initializeApp({
      projectId: config.projectId,
    });
    logger.info('Firebase Admin initialized with emulator host: ' + config.projectId);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: config.projectId,
      });
      logger.info('Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT environment variable.');
    } catch (e) {
      logger.error(e, 'Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable.');
      admin.initializeApp({ projectId: config.projectId });
    }
  } else if (fs.existsSync(config.serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(config.serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: config.projectId,
      });
      logger.info('Firebase Admin initialized with service account key.');
    } catch (e) {
      logger.warn(e, 'Failed to parse service-account.json. Falling back to default credentials.');
      admin.initializeApp({ projectId: config.projectId });
    }
  } else if (fs.existsSync('/etc/secrets/service-account.json')) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync('/etc/secrets/service-account.json', 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: config.projectId,
      });
      logger.info('Firebase Admin initialized with /etc/secrets/service-account.json.');
    } catch (e) {
      logger.warn(e, 'Failed to parse /etc/secrets/service-account.json.');
      admin.initializeApp({ projectId: config.projectId });
    }
  } else {
    admin.initializeApp({
      projectId: config.projectId,
    });
    logger.info('Firebase Admin initialized with default project credentials.');
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
