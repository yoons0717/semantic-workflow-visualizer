import { streamText } from 'ai';
import { anthropic, CLAUDE_MODEL, SYSTEM_PROMPT } from '@/lib/claude';

export async function POST(req: Request) {
  // 스트림 시작 전에 API 키 유무를 확인해 클라이언트가 res.ok로 에러를 감지할 수 있게 함.
  // AI SDK는 에러가 생겨도 HTTP 200으로 스트림을 시작하기 때문에 여기서 먼저 체크해야 한다.
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { messages } = await req.json();

    const result = streamText({
      model: anthropic(CLAUDE_MODEL),
      system: SYSTEM_PROMPT,
      messages,
    });

    const textResponse = result.toTextStreamResponse();

    return new Response(textResponse.body, {
      headers: {
        ...Object.fromEntries(textResponse.headers.entries()),
        'x-prompt-log': encodeURIComponent(JSON.stringify({ system: SYSTEM_PROMPT })),
      },
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
