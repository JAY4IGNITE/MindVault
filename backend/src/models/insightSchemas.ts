import { z } from 'zod';

export const ThemeGroupingSchema = z.object({
  themes: z
    .array(
      z.object({
        theme: z.string().min(2).max(100),
        memoryIds: z.array(z.string()).min(2),
        frequency: z.number().min(2),
      })
    )
    .max(10),
});

export const InsightGeneratedSchema = z.object({
  summary: z.string().max(500),
  possibleInterpretation: z.string().max(1000),
  suggestedReflection: z.string().max(500),
});
