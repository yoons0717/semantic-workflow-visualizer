// POST /api/tasks — LLM 분석 텍스트에서 notion/slack 타입 태스크 목록 추출 (JSON 반환)
import { generateObject } from 'ai';
import { z } from 'zod';
import { geminiProvider, GEMINI_MODEL } from '@/lib/gemini';

const GenerationSchema = z.object({
  tasks: z.array(z.object({
    type: z.enum(['notion', 'slack']),
    title: z.string(),
    description: z.string(),
    priority: z.enum(['High', 'Medium', 'Low']).optional(),
    channel: z.string().optional(),
    message: z.string().optional(),
  })),
});

const TASK_EXTRACTION_PROMPT = `You are a task extraction engine. Given a PR code review analysis, extract actionable tasks.

Create TWO types of tasks:

**notion** — For every code issue found: bugs, improvements, convention violations.
  required: title, description, priority (High/Medium/Low)
  priority: High = bugs/security issues, Medium = improvements, Low = minor suggestions

**slack** — ONLY for High-priority bugs requiring immediate team notification.
  required: channel ("#general" by default), message (1-2 sentence alert)

When a critical bug is found, create BOTH a notion task (for tracking) and a slack task (for immediate notification).

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

    const tasks = object.tasks.map((t) => {
      if (t.type === 'slack') {
        return {
          id: crypto.randomUUID(),
          title: t.title,
          description: t.description,
          type: 'slack' as const,
          status: 'pending' as const,
          payload: {
            channel: t.channel ?? '#general',
            message: t.message ?? t.title,
          },
        };
      }
      return {
        id: crypto.randomUUID(),
        title: t.title,
        description: t.description,
        type: 'notion' as const,
        status: 'pending' as const,
        payload: {
          database_id: '__selected__',
          title: t.title,
          status: 'Not started',
          priority: t.priority ?? 'Medium',
        },
      };
    });

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
