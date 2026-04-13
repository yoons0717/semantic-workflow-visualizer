import { generateObject } from 'ai';
import { z } from 'zod';
import { groqProvider, GROQ_MODEL } from '@/lib/groq';
import { WorkflowTaskArraySchema } from '@/lib/taskSchema';

const TASK_EXTRACTION_PROMPT = `You are a task extraction engine. Given an AI analysis text, extract all actionable tasks.

Type selection rules:
- "slack": sending messages, notifications, alerts to a channel or user
- "jira": creating tickets, issues, tasks in a project tracker
- "email": sending emails
- "generic": everything else

Payload keys by type:
- slack: { "channel": "...", "message": "..." }
- jira: { "project": "...", "summary": "...", "type": "Bug|Task|Story" }
- email: { "to": "...", "subject": "...", "body": "..." }
- generic: { "action": "..." }

If there are no executable tasks, return an empty tasks array.`;

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json([]);
  }

  try {
    const { analysisText } = await req.json();

    if (!analysisText?.trim()) {
      return Response.json([]);
    }

    const { object } = await generateObject({
      model: groqProvider(GROQ_MODEL),
      schema: z.object({ tasks: WorkflowTaskArraySchema }),
      system: TASK_EXTRACTION_PROMPT,
      messages: [{ role: 'user', content: analysisText }],
    });

    return Response.json(object.tasks);
  } catch {
    return Response.json([]);
  }
}
