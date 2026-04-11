import { generateText } from 'ai';
import { groqProvider, GROQ_MODEL } from '@/lib/groq';
import type { WorkflowTask } from '@/types';

const TASK_EXTRACTION_PROMPT = `You are a task extraction engine. Given an AI analysis text, extract all actionable tasks and return them as a JSON array ONLY — no explanation, no markdown, no code block.

Schema for each task:
{
  "id": "<unique string, e.g. task-1>",
  "title": "<short action title>",
  "description": "<one sentence describing what this task does>",
  "type": "<'slack' | 'jira' | 'email' | 'generic'>",
  "payload": { "<key>": "<value>" },
  "status": "pending"
}

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

If there are no executable tasks in the analysis, return an empty array: []

Return ONLY valid JSON. No other text.`;

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
    });

    // JSON 블록이 있으면 추출, 없으면 전체 텍스트 시도
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\[[\s\S]*\])/);
    const rawJson = jsonMatch ? jsonMatch[1] : text;

    const tasks: WorkflowTask[] = JSON.parse(rawJson.trim());

    if (!Array.isArray(tasks)) return Response.json([]);

    return Response.json(tasks);
  } catch {
    return Response.json([]);
  }
}
