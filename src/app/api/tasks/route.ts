// POST /api/tasks — LLM 분석 텍스트에서 notion 타입 태스크 목록 추출 (JSON 반환)
import { generateText } from 'ai';
import { z } from 'zod';
import { geminiProvider, GEMINI_MODEL } from '@/lib/gemini';
import { WorkflowTaskArraySchema } from '@/lib/taskSchema';

const ResponseSchema = z.object({ tasks: WorkflowTaskArraySchema });

const TASK_EXTRACTION_PROMPT = `You are a task extraction engine. Given an AI analysis text, extract all actionable tasks as Notion issues and return ONLY a JSON object with a "tasks" array.

Every task must have type "notion" with this exact payload shape:
{ "database_id": "__selected__", "title": "...", "status": "Not started", "priority": "Medium" }

Use priority "High" for bugs and critical issues, "Medium" for improvements, "Low" for minor suggestions.

Return ONLY this JSON structure, no other text:
{ "tasks": [ { "id": "task-1", "title": "...", "description": "...", "type": "notion", "payload": { "database_id": "__selected__", "title": "...", "status": "Not started", "priority": "Medium" }, "status": "pending" } ] }

If there are no actionable tasks, return: { "tasks": [] }`;

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { analysisText } = await req.json();

    if (!analysisText?.trim()) {
      return Response.json([]);
    }

    const { text } = await generateText({
      model: geminiProvider(GEMINI_MODEL),
      system: TASK_EXTRACTION_PROMPT,
      messages: [{ role: 'user', content: analysisText }],
    });

    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const raw = JSON.parse(cleaned);
    const { tasks } = ResponseSchema.parse(raw);

    return Response.json(tasks);
  } catch (err) {
    console.error('[/api/tasks]', err);
    return Response.json({ error: "Failed to extract tasks" }, { status: 500 });
  }
}
