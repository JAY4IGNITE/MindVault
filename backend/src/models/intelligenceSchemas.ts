import { z } from 'zod';

const importanceSchema = z.number().min(1).max(10);
const baseEntitySchema = z.object({
  title: z.string().min(1).max(200),
  suggestedId: z.string().optional(),
});

// 1. Summary
export const SummarySchema = z.object({
  conciseSummary: z.string().min(5).max(1000),
  keyPoints: z.array(z.string()).min(1).max(10),
  importantStatements: z.array(z.string()).optional(),
  context: z.string().optional(),
});

// 2. Memory Extraction
export const MemoryTypeEnum = z.enum([
  'idea',
  'preference',
  'project_plan',
  'important_event',
  'recurring_concern',
  'fact',
]);

export const MemorySchema = baseEntitySchema.extend({
  type: MemoryTypeEnum,
  content: z.string().min(5).max(2000),
  importance: importanceSchema,
});

export const MemoriesOutputSchema = z.object({
  memories: z.array(MemorySchema),
});

// 3. Goal Extraction
export const GoalStatusEnum = z.enum([
  'not_started',
  'in_progress',
  'on_hold',
  'completed',
  'abandoned',
]);

export const GoalPriorityEnum = z.enum(['low', 'medium', 'high']);

export const GoalSchema = baseEntitySchema.extend({
  description: z.string().max(1000).optional(),
  status: GoalStatusEnum.default('not_started'),
  priority: GoalPriorityEnum.default('medium'),
  deadline: z.string().optional(),
});

export const GoalsOutputSchema = z.object({
  goals: z.array(GoalSchema),
});

// 4. Decision Extraction
export const DecisionStatusEnum = z.enum(['pending', 'made', 'under_review', 'revoked']);

export const DecisionSchema = z.object({
  decision: z.string().min(5).max(300),
  reasoning: z.string().min(5).max(2000),
  status: DecisionStatusEnum.default('made'),
  date: z.string().optional(),
});

export const DecisionsOutputSchema = z.object({
  decisions: z.array(DecisionSchema),
});

// 5. Topics
export const TopicsOutputSchema = z.object({
  topics: z.array(z.string().min(2).max(50)).max(20),
});

// 6. Relationships
export const RelationshipTypeEnum = z.enum([
  'related_to',
  'supports',
  'depends_on',
  'affects',
  'inspired_by',
  'contradicts',
]);

export const RawRelationshipSchema = z.object({
  sourceIndex: z.number().int(),
  targetIndex: z.number().int(),
  type: RelationshipTypeEnum,
  description: z.string().optional(),
});

export const RelationshipsOutputSchema = z.object({
  relationships: z.array(RawRelationshipSchema),
});

// Ask My Memory RAG answer
export const AskAnswerSchema = z.object({
  answer: z.string(),
  supportingSourceIds: z.array(z.string()),
  hasInsufficientEvidence: z.boolean(),
});
