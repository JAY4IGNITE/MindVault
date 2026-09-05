import { db } from './firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from '../utils/logger';

export const seedMockData = async (uid: string) => {
  const userRef = db.collection('users').doc(uid);
  const now = new Date();

  const daysAgo = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return Timestamp.fromDate(d);
  };

  const batch = db.batch();

  // 1. Mock Journal Entries
  const journals = [
    {
      id: 'journal_arch_01',
      title: 'Architectural Reflections: Cognitive Retrieval & Local-First Storage',
      content:
        'Today we solidified the decision to use a hybrid cognitive retrieval layer. By combining local client-side encryption with Fastify on Render and Gemini 3.6 Flash for synthesis, we preserve total data sovereignty. User thoughts should never be stored in plain text across uncontrolled third-party servers.',
      conciseSummary:
        'Evaluated and finalized MindVault cognitive retrieval architecture, prioritizing zero-knowledge privacy and low-latency API response times.',
      topics: ['Architecture', 'Privacy', 'Gemini AI', 'Fastify'],
      mood: 'Focused & Inspired',
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: daysAgo(2),
    },
    {
      id: 'journal_deepwork_02',
      title: 'Deep Work Rhythm and Context-Switching Reduction',
      content:
        'Noticed a substantial reduction in mental fatigue when reserving morning blocks (8 AM - 11 AM) strictly for high-entropy cognitive tasks. Offloading spontaneous ideas directly to MindVault voice/chat keeps the working memory clear for flow state.',
      conciseSummary:
        'Reflected on productivity optimization: morning deep work paired with immediate idea capture minimizes context switching.',
      topics: ['Productivity', 'Deep Work', 'Habits'],
      mood: 'Energized',
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: daysAgo(5),
    },
    {
      id: 'journal_graph_03',
      title: 'Knowledge Graph Emergence from Conversational Threads',
      content:
        'The automated relationship extraction pipeline is working exceptionally well. When discussing goal milestones and decisions in chat, the graph automatically links supporting memories into a semantic web.',
      conciseSummary:
        'Validated automated entity extraction: conversational fragments turn into an interactive 3D Knowledge Graph.',
      topics: ['Knowledge Graph', 'AI Extraction', 'MindVault'],
      mood: 'Accomplished',
      date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: daysAgo(8),
    },
  ];

  for (const j of journals) {
    const ref = userRef.collection('journals').doc(j.id);
    batch.set(ref, j, { merge: true });
  }

  // 2. Mock Atomic Memories
  const memories = [
    {
      id: 'mem_01',
      title: 'Zero-Knowledge Privacy Directive',
      content: 'Personal memories and journal entries must be encrypted at rest with client-derived cryptographic keys.',
      type: 'preference',
      importance: 10,
      createdAt: daysAgo(10),
    },
    {
      id: 'mem_02',
      title: 'Gemini 3.6 Flash Pipeline Latency',
      content: 'Gemini 3.6 Flash achieves sub-800ms generation for structured JSON entity extraction and semantic classification.',
      type: 'fact',
      importance: 8,
      createdAt: daysAgo(6),
    },
    {
      id: 'mem_03',
      title: '3D Force-Directed Cognitive Map',
      content: 'Idea to use Three.js force-directed graph to visualize real-time associative recall between disparate thoughts.',
      type: 'idea',
      importance: 9,
      createdAt: daysAgo(4),
    },
    {
      id: 'mem_04',
      title: 'Render Webhook Keep-Alive Cron',
      content: 'Render free-tier instances sleep after 15 minutes of inactivity; keep alive via lightweight /health endpoint monitoring.',
      type: 'fact',
      importance: 7,
      createdAt: daysAgo(3),
    },
    {
      id: 'mem_05',
      title: 'Context Fragmentation Vulnerability',
      content: 'Scattering thoughts across Slack, notes, and browser tabs causes up to 30% drop in project execution velocity.',
      type: 'recurring_concern',
      importance: 8,
      createdAt: daysAgo(7),
    },
    {
      id: 'mem_06',
      title: 'MindVault Public Demo Day',
      content: 'Presenting the MindVault private cognitive architecture to showcase AI-assisted reflective intelligence.',
      type: 'important_event',
      importance: 10,
      createdAt: daysAgo(1),
    },
  ];

  for (const m of memories) {
    const ref = userRef.collection('memories').doc(m.id);
    batch.set(ref, m, { merge: true });
  }

  // 3. Mock Goals
  const goals = [
    {
      id: 'goal_01',
      title: 'Deliver MindVault Live Architecture Demo',
      description: 'Showcase end-to-end flow: Chat thought capture, Gemini 3.6 Flash pipeline, Knowledge Graph, and Decision Review.',
      status: 'in_progress',
      priority: 'high',
      targetDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: daysAgo(5),
    },
    {
      id: 'goal_02',
      title: 'Sub-100ms Knowledge Graph Querying',
      description: 'Implement Redis edge caching and incremental graph sync for instant visual exploration.',
      status: 'completed',
      priority: 'high',
      targetDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: daysAgo(12),
    },
    {
      id: 'goal_03',
      title: 'Longitudinal Pattern Synthesis Engine',
      description: 'Aggregate 60-day memory clusters to surface recurring themes and subconscious cognitive biases.',
      status: 'completed',
      priority: 'medium',
      targetDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: daysAgo(15),
    },
    {
      id: 'goal_04',
      title: 'Mobile-Optimized Progressive Web Vault',
      description: 'Enable offline capture with background sync queue for moments without internet access.',
      status: 'not_started',
      priority: 'medium',
      targetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: daysAgo(4),
    },
  ];

  for (const g of goals) {
    const ref = userRef.collection('goals').doc(g.id);
    batch.set(ref, g, { merge: true });
  }

  // 4. Mock Decisions
  const decisions = [
    {
      id: 'decision_01',
      decision: 'Selected Fastify + TypeScript for Secure MindVault Backend',
      reasoning:
        'Fastify provides up to 5x higher throughput than Express, built-in schema serialization, and seamless TypeScript integration with minimal overhead.',
      status: 'completed',
      date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expectedOutcome: 'Low CPU usage on Render and predictable response times under 50ms for non-AI routes.',
      actualOutcome: 'Endpoints operate at ~25ms latency with reliable rate-limiting and security headers.',
      reviewDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      retrospective: {
        retrospectiveSummary: 'High-leverage architectural decision that streamlined type safety and microsecond routing.',
        keyTakeaways: [
          'Fastify schema validation caught payload discrepancies early.',
          'Render cold start times remained low due to lean dependency tree.',
        ],
        reviewedAt: new Date().toISOString(),
      },
      createdAt: daysAgo(14),
    },
    {
      id: 'decision_02',
      decision: 'Upgrade to Gemini 3.6 Flash for Zero-Shot Intelligence Extraction',
      reasoning:
        'Gemini 3.6 Flash offers superior reasoning capabilities for entity detection, topic modeling, and natural conversation flow with high token limits.',
      status: 'active',
      date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expectedOutcome: 'Zero JSON parse errors across complex multi-entity thoughts.',
      actualOutcome: 'Reliable extraction rate exceeding 99% with accurate relationship detection.',
      reviewDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: daysAgo(4),
    },
    {
      id: 'decision_03',
      decision: 'Keep Keep-Alive Health Endpoint Allowlisted from Rate Limiter',
      reasoning:
        'Pinging /health every 10-14 minutes prevents Render server spin-down without risking IP rate-limit lockouts.',
      status: 'active',
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expectedOutcome: 'Zero cold-start delays during live demo presentations.',
      actualOutcome: 'Server remains warm with 200 OK responses around the clock.',
      reviewDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: daysAgo(1),
    },
  ];

  for (const d of decisions) {
    const ref = userRef.collection('decisions').doc(d.id);
    batch.set(ref, d, { merge: true });
  }

  // 5. Mock Knowledge Graph Relationships (edges between memories, goals, decisions)
  const relationships = [
    {
      id: 'rel_01',
      sourceId: 'mem_01',
      targetId: 'decision_01',
      type: 'supports',
      createdAt: daysAgo(8),
    },
    {
      id: 'rel_02',
      sourceId: 'decision_02',
      targetId: 'goal_01',
      type: 'supports',
      createdAt: daysAgo(3),
    },
    {
      id: 'rel_03',
      sourceId: 'mem_03',
      targetId: 'goal_02',
      type: 'inspired_by',
      createdAt: daysAgo(4),
    },
    {
      id: 'rel_04',
      sourceId: 'decision_03',
      targetId: 'goal_01',
      type: 'depends_on',
      createdAt: daysAgo(1),
    },
    {
      id: 'rel_05',
      sourceId: 'mem_05',
      targetId: 'goal_03',
      type: 'affects',
      createdAt: daysAgo(5),
    },
    {
      id: 'rel_06',
      sourceId: 'mem_02',
      targetId: 'decision_02',
      type: 'supports',
      createdAt: daysAgo(4),
    },
  ];

  for (const r of relationships) {
    const ref = userRef.collection('relationships').doc(r.id);
    batch.set(ref, r, { merge: true });
  }

  // 6. Mock Longitudinal AI Insights
  const insights = [
    {
      id: 'theme_cognitive_privacy_and_deep_work',
      type: 'recurring_theme',
      theme: 'Cognitive Privacy & Deep Work Optimization',
      frequency: 6,
      supportingMemoryIds: ['mem_01', 'mem_03', 'mem_05'],
      timeRange: 'Past 30 days',
      summary:
        'A consistent pattern prioritizes architectural sovereignty and intentional cognitive environments over hyper-connected convenience.',
      possibleInterpretation:
        'Reflects a mature transition toward sustainable intellectual output, minimizing context switching through centralized capture.',
      suggestedReflection:
        'Which existing workflows still produce unnecessary context switching, and can MindVault automate their synthesis?',
      createdAt: daysAgo(2),
    },
    {
      id: 'theme_high_performance_systems',
      type: 'recurring_theme',
      theme: 'High-Throughput Low-Latency Systems',
      frequency: 4,
      supportingMemoryIds: ['mem_02', 'mem_04'],
      timeRange: 'Past 14 days',
      summary:
        'Strong focus on performance benchmarks, from sub-50ms server responses to persistent uptime mechanisms.',
      possibleInterpretation:
        'Indicates a high technical bar for real-time responsiveness and reliability in product delivery.',
      suggestedReflection:
        'How does minimizing latency directly translate to deeper user trust during live exploratory thinking?',
      createdAt: daysAgo(1),
    },
  ];

  for (const ins of insights) {
    const ref = userRef.collection('insights').doc(ins.id);
    batch.set(ref, ins, { merge: true });
  }

  // 7. Mock Conversation with MindVault Assistant
  const convRef = userRef.collection('conversations').doc('conv_demo_presentation');
  batch.set(
    convRef,
    {
      topic: 'MindVault System Architecture & Demo Preparation',
      createdAt: daysAgo(1),
      updatedAt: daysAgo(0),
    },
    { merge: true }
  );

  const messages = [
    {
      id: 'msg_01',
      role: 'user',
      content:
        'MindVault, summarize the key architectural pillars we built for our private second brain before the presentation.',
      timestamp: daysAgo(1),
    },
    {
      id: 'msg_02',
      role: 'model',
      content:
        'Here is the foundational architecture of your MindVault second brain:\n\n1. **Zero-Knowledge Core**: Private data remains user-owned with client encryption and isolated Firestore collections.\n2. **Low-Latency Synthesis**: Fastify API pipeline powered by Gemini 3.6 Flash for sub-second entity and relationship extraction.\n3. **Dynamic Knowledge Graph**: Multi-entity semantic graph connecting memories, decisions, and goals in 3D force simulation.\n4. **Longitudinal Reflection**: Automated theme grouping and retrospective reviews that prevent forgotten insights.\n\nAll systems are operating at nominal latency, and the server is kept warm.',
      timestamp: daysAgo(1),
    },
  ];

  for (const m of messages) {
    const mRef = convRef.collection('messages').doc(m.id);
    batch.set(mRef, m, { merge: true });
  }

  await batch.commit();
  logger.info({ uid }, 'Successfully seeded rich presentation mock data');

  return {
    success: true,
    message: 'Demo presentation data loaded successfully.',
    counts: {
      journals: journals.length,
      memories: memories.length,
      goals: goals.length,
      decisions: decisions.length,
      relationships: relationships.length,
      insights: insights.length,
    },
  };
};

export const clearMockData = async (uid: string) => {
  const userRef = db.collection('users').doc(uid);
  const collections = ['journals', 'memories', 'goals', 'decisions', 'relationships', 'insights'];

  for (const colName of collections) {
    const snap = await userRef.collection(colName).get();
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  return { success: true, message: 'All vault data cleared.' };
};
