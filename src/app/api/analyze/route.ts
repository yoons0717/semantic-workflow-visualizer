import { streamText } from 'ai';
import { groqProvider, GROQ_MODEL, SYSTEM_PROMPT } from '@/lib/groq';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: groqProvider(GROQ_MODEL),
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
}
