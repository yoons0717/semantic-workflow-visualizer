// POST /api/analyze — 사용자 텍스트 또는 PR diff를 LLM(Groq)으로 스트리밍 분석
import { streamText } from 'ai';
import { groqProvider, GROQ_MODEL, SYSTEM_PROMPT, PR_ANALYSIS_SYSTEM_PROMPT } from '@/lib/groq';

export async function POST(req: Request) {
  // 스트림 시작 전에 API 키 유무를 확인해 클라이언트가 res.ok로 에러를 감지할 수 있게 함.
  // AI SDK는 에러가 생겨도 HTTP 200으로 스트림을 시작하기 때문에 여기서 먼저 체크해야 한다.
  if (!process.env.GROQ_API_KEY) {
    return Response.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { messages, mode } = await req.json();
    const system = mode === 'pr' ? PR_ANALYSIS_SYSTEM_PROMPT : SYSTEM_PROMPT;

    const result = streamText({
      model: groqProvider(GROQ_MODEL),
      system,
      messages,
    });

    const textResponse = result.toTextStreamResponse();

    return new Response(textResponse.body, {
      headers: {
        ...Object.fromEntries(textResponse.headers.entries()),
        'x-prompt-log': encodeURIComponent(JSON.stringify({ system })),
      },
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
