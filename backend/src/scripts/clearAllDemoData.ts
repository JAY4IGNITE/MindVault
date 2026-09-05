import { db } from '../services/firebaseAdmin';
import { logger } from '../utils/logger';

const DEMO_DOC_IDS = {
  journals: ['journal_arch_01', 'journal_deepwork_02', 'journal_graph_03'],
  memories: ['mem_01', 'mem_02', 'mem_03', 'mem_04', 'mem_05', 'mem_06'],
  goals: ['goal_01', 'goal_02', 'goal_03', 'goal_04'],
  decisions: ['decision_01', 'decision_02', 'decision_03'],
  relationships: ['rel_01', 'rel_02', 'rel_03', 'rel_04', 'rel_05', 'rel_06'],
  insights: ['theme_cognitive_privacy_and_deep_work', 'theme_high_performance_systems'],
  conversations: ['conv_demo_presentation'],
};

async function purgeAllDemoData() {
  console.log('==============================================');
  console.log('Starting Full MindVault Demo Dataset Purge...');
  console.log('==============================================\n');

  let totalDeleted = 0;

  // 1. Delete specific demo documents from every user
  const usersSnap = await db.collection('users').get();
  const allUserIds = new Set<string>();

  // Include any users found in users collection or known user IDs
  usersSnap.docs.forEach((doc) => allUserIds.add(doc.id));
  allUserIds.add('cTV7zfN7ThWIU5hdM9RNpwcsgPq1');
  allUserIds.add('cYZTcY7xQfY1TbkPHgUKmTtTjYu2');
  allUserIds.add('user_alice');
  allUserIds.add('demo-presentation-user');

  for (const uid of allUserIds) {
    console.log(`Processing user: ${uid}`);
    const userRef = db.collection('users').doc(uid);

    // If user is dummy test user 'user_alice' or 'demo-presentation-user', delete all subcollections
    if (uid === 'user_alice' || uid === 'demo-presentation-user') {
      const subcols = ['journals', 'memories', 'goals', 'decisions', 'relationships', 'insights', 'conversations'];
      for (const col of subcols) {
        const snap = await userRef.collection(col).get();
        if (!snap.empty) {
          const batch = db.batch();
          snap.docs.forEach((d) => {
            batch.delete(d.ref);
            totalDeleted++;
          });
          await batch.commit();
          console.log(`  Purged all ${snap.size} ${col} for test user ${uid}`);
        }
      }
      await userRef.delete();
      continue;
    }

    // For registered users, selectively delete ONLY demo dataset documents
    for (const [colName, ids] of Object.entries(DEMO_DOC_IDS)) {
      const batch = db.batch();
      let count = 0;

      for (const id of ids) {
        const docRef = userRef.collection(colName).doc(id);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
          // If conversation, delete nested messages first
          if (colName === 'conversations') {
            const msgsSnap = await docRef.collection('messages').get();
            msgsSnap.docs.forEach((m) => {
              batch.delete(m.ref);
              totalDeleted++;
            });
          }

          batch.delete(docRef);
          count++;
          totalDeleted++;
        }
      }

      if (count > 0) {
        await batch.commit();
        console.log(`  Deleted ${count} demo documents from ${colName}`);
      }
    }
  }

  // 2. Double check collectionGroups to ensure zero demo docs remain anywhere
  console.log('\nScanning collection groups for any remaining demo IDs...');
  for (const [colName, ids] of Object.entries(DEMO_DOC_IDS)) {
    const cgSnap = await db.collectionGroup(colName).get();
    const batch = db.batch();
    let orphanCount = 0;

    for (const doc of cgSnap.docs) {
      if (ids.includes(doc.id)) {
        if (colName === 'conversations') {
          const msgs = await doc.ref.collection('messages').get();
          msgs.docs.forEach((m) => {
            batch.delete(m.ref);
            totalDeleted++;
          });
        }
        batch.delete(doc.ref);
        orphanCount++;
        totalDeleted++;
      }
    }

    if (orphanCount > 0) {
      await batch.commit();
      console.log(`  Purged ${orphanCount} orphan demo docs in ${colName}`);
    }
  }

  console.log('\n==============================================');
  console.log(`Demo Dataset Purge Complete!`);
  console.log(`Total demo documents removed: ${totalDeleted}`);
  console.log('==============================================\n');
}

purgeAllDemoData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Purge failed:', err);
    process.exit(1);
  });
