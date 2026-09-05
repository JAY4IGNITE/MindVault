import { seedMockData } from '../services/mockDataService';
import { db, auth } from '../services/firebaseAdmin';
import { logger } from '../utils/logger';

async function main() {
  const targetUid = process.argv[2];

  let uid = targetUid;
  if (!uid) {
    // Look up the first user in auth or firestore
    try {
      const usersList = await auth.listUsers(1);
      if (usersList.users.length > 0) {
        uid = usersList.users[0].uid;
        logger.info(`Found registered user: ${usersList.users[0].email || uid}`);
      }
    } catch (e) {
      // ignore
    }

    if (!uid) {
      // Fallback to checking firestore users collection
      const snap = await db.collection('users').limit(1).get();
      if (!snap.empty) {
        uid = snap.docs[0].id;
        logger.info(`Found user from firestore: ${uid}`);
      }
    }
  }

  if (!uid) {
    uid = 'demo-presentation-user';
    logger.info(`Using fallback demo user ID: ${uid}`);
  }

  console.log(`\n========================================`);
  console.log(`Seeding MindVault Presentation Mock Data`);
  console.log(`Target User UID: ${uid}`);
  console.log(`========================================\n`);

  const result = await seedMockData(uid);
  console.log('Result:', JSON.stringify(result, null, 2));
  console.log('\nDone! The presentation vault is ready.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to seed demo data:', err);
  process.exit(1);
});
