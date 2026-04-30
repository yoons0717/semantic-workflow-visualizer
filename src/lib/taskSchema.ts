import { z } from 'zod';

export const WorkflowTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['slack', 'notion']),
  payload: z.record(z.string(), z.string()),
  status: z.literal('pending'),
});

export const WorkflowTaskArraySchema = z.array(WorkflowTaskSchema);
