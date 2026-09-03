import { z } from 'zod';

export const DecisionStatusEnum = z.enum(['active', 'reviewed', 'completed', 'changed']);

export const CreateDecisionSchema = z.object({
  decision: z.string().min(3).max(500),
  reasoning: z.string().min(3).max(3000),
  date: z.string(), // ISO string
  expectedOutcome: z.string().max(2000).optional(),
  reviewDate: z.string().optional().nullable(),
  relatedMemoryIds: z.array(z.string()).optional(),
});

export const UpdateDecisionSchema = z.object({
  decision: z.string().min(3).max(500).optional(),
  reasoning: z.string().min(3).max(3000).optional(),
  status: DecisionStatusEnum.optional(),
  expectedOutcome: z.string().max(2000).optional(),
  actualOutcome: z.string().max(3000).optional(),
  reviewDate: z.string().nullable().optional(),
  lessonsLearned: z.string().max(3000).optional(),
});

export const DecisionReviewOutputSchema = z.object({
  retrospectiveSummary: z.string().max(1000),
  keyTakeaways: z.array(z.string()).max(10),
});
