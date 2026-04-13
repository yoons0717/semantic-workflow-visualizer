import { generateText } from 'ai';
import { z } from 'zod';
import { groqProvider, GROQ_MODEL } from '@/lib/groq';
import { WorkflowTaskArraySchema } from '@/lib/taskSchema';

const ResponseSchema = z.object({ tasks: WorkflowTaskArraySchema });

const TASK_EXTRACTION_PROMPT = `You are a task extraction engine. Given an AI analysis text, extract all actionable tasks and return ONLY a JSON object with a "tasks" array.

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

Return ONLY this JSON structure, no other text:
{ "tasks": [ { "id": "task-1", "title": "...", "description": "...", "type": "...", "payload": {...}, "status": "pending" } ] }

If there are no executable tasks, return: { "tasks": [] }`;

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    return Response.json([]);
  }

  try {
    const { analysisText } = await req.json();

    if (!analysisText?.trim()) {
      return Response.json([]);
    }

    const { text } = await generateText({
      model: groqProvider(GROQ_MODEL),
      system: TASK_EXTRACTION_PROMPT,
      messages: [{ role: 'user', content: analysisText }],
      providerOptions: {
        groq: { response_format: { type: 'json_object' } },
      },
    });

    const raw = JSON.parse(text);
    const { tasks } = ResponseSchema.parse(raw);

    return Response.json(tasks);
  } catch {
    return Response.json([]);
  }

}
