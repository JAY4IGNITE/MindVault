import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import path from 'path';
import { setDoc, getDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;
const PROJECT_ID = 'mindvault-test-project';
const rules = fs.readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8');

describe('LAYER 1: Firestore Security & Data Isolation', () => {
  beforeAll(async () => {
    // Only run if emulator host is available; otherwise skip gracefully
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      console.warn('FIRESTORE_EMULATOR_HOST not set. Skipping emulator-dependent rules tests.');
      return;
    }
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules, host: '127.0.0.1', port: 8080 },
    });
  });

  afterEach(async () => {
    if (testEnv) await testEnv.clearFirestore();
  });

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  const getAuth = (uid: string) => testEnv.authenticatedContext(uid).firestore();
  const getUnauth = () => testEnv.unauthenticatedContext().firestore();

  it('User A can create and read their own Journal entry', async () => {
    if (!testEnv) return;
    const dbA = getAuth('user_a');
    const docRef = doc(dbA, 'users/user_a/journals/j1');
    await assertSucceeds(
      setDoc(docRef, { content: 'Secret A', date: '2023-01-01', createdAt: new Date() })
    );
    await assertSucceeds(getDoc(docRef));
  });

  it("User A CANNOT read User B's Journal entry (IDOR Prevention)", async () => {
    if (!testEnv) return;
    const dbB = getAuth('user_b');
    await setDoc(doc(dbB, 'users/user_b/journals/j_b_secret'), {
      content: "B's Secret",
      date: '2023-01-01',
      createdAt: new Date(),
    });

    const dbA = getAuth('user_a');
    const targetRef = doc(dbA, 'users/user_b/journals/j_b_secret');
    await assertFails(getDoc(targetRef));
  });

  it("User A CANNOT write under User B's path", async () => {
    if (!testEnv) return;
    const dbA = getAuth('user_a');
    const targetRef = doc(dbA, 'users/user_b/memories/m1');
    await assertFails(
      setDoc(targetRef, { fact: 'Attempting to plant data', importance: 10, createdAt: new Date() })
    );
  });

  it('Unauthenticated caller CANNOT access user private data', async () => {
    if (!testEnv) return;
    const dbUnauth = getUnauth();
    await assertFails(getDoc(doc(dbUnauth, 'users/user_a/journals/j1')));
  });
});
