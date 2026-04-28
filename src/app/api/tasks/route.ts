import { generateText } from 'ai';
import { z } from 'zod';
import { anthropic, CLAUDE_MODEL } from '@/lib/claude';
import { WorkflowTaskArraySchema } from '@/lib/taskSchema';

const ResponseSchema = z.object({ tasks: WorkflowTaskArraySchema });

const TASK_EXTRACTION_PROMPT = `You are a task extraction engine. Given an AI analysis text, extract all actionable tasks and return ONLY a JSON object with a "tasks" array.

Type selection rules:
- "slack": sending messages, notifications, alerts to a channel or user
- "jira": creating tickets, issues, tasks in a project tracker
- "email": sending emails
- "notion": creating entries or documents in Notion (issues, tasks, notes, reports)
- "generic": everything else

Payload keys by type:
- slack: { "channel": "...", "message": "..." }
- jira: { "project": "...", "summary": "...", "type": "Bug|Task|Story" }
- email: { "to": "...", "subject": "...", "body": "..." }
- notion: { "database_id": "__selected__", "title": "...", "status": "Not started", "priority": "Medium" }
- generic: { "action": "..." }

Return ONLY this JSON structure, no other text:
{ "tasks": [ { "id": "task-1", "title": "...", "description": "...", "type": "...", "payload": {...}, "status": "pending" } ] }

If there are no executable tasks, return: { "tasks": [] }`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { analysisText } = await req.json();

    if (!analysisText?.trim()) {
      return Response.json([]);
    }

    const { text } = await generateText({
      model: anthropic(CLAUDE_MODEL),
      system: TASK_EXTRACTION_PROMPT,
      messages: [{ role: 'user', content: analysisText }],
    });

    const raw = JSON.parse(text);
    const { tasks } = ResponseSchema.parse(raw);

    return Response.json(tasks);
  } catch {
    return Response.json({ error: "Failed to extract tasks" }, { status: 500 });
  }
}
