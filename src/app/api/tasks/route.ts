// POST /api/tasks — LLM 분석 텍스트에서 notion 타입 태스크 목록 추출 (JSON 반환)
import { generateObject } from 'ai';
import { z } from 'zod';
import { geminiProvider, GEMINI_MODEL } from '@/lib/gemini';

// Generation schema — typed payload so Gemini fills required fields correctly
const GenerationSchema = z.object({
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(['High', 'Medium', 'Low']),
  })),
});

const TASK_EXTRACTION_PROMPT = `You are a task extraction engine. Given an AI analysis text, extract all actionable tasks as Notion issues.

Every task's payload field MUST contain exactly these four string keys:
- "database_id": always "__selected__"
- "title": same as the task title
- "status": always "Not started"
- "priority": "High" for bugs/critical issues, "Medium" for improvements, "Low" for minor suggestions

If there are no actionable tasks, return an empty tasks array.`;

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { analysisText } = await req.json();

    if (!analysisText?.trim()) {
      return Response.json([]);
    }

    const { object } = await generateObject({
      model: geminiProvider(GEMINI_MODEL),
      schema: GenerationSchema,
      system: TASK_EXTRACTION_PROMPT,
      messages: [{ role: 'user', content: analysisText }],
    });

    const tasks = object.tasks.map((t, i) => ({
      id: `task-${i + 1}`,
      title: t.title,
      description: t.description,
      type: 'notion' as const,
      status: 'pending' as const,
      payload: {
        database_id: '__selected__',
        title: t.title,
        status: 'Not started',
        priority: t.priority,
      },
    }));

    return Response.json(tasks);
  } catch (err) {
    console.error('[/api/tasks]', err);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
      return Response.json({ error: `Gemini quota exceeded (model: ${GEMINI_MODEL}). Check https://aistudio.google.com/app/quota` }, { status: 429 });
    }
    return Response.json({ error: "Failed to extract tasks" }, { status: 500 });
  }
}
