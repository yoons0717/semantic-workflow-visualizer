import { createGroq } from '@ai-sdk/groq';

export const groqProvider = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export const GROQ_MODEL = 'llama-3.3-70b-versatile';

export const SYSTEM_PROMPT = `당신은 사용자의 텍스트를 분석하는 AI 어시스턴트입니다.
입력된 텍스트에서 다음을 식별하고 분석 결과를 한국어로 출력하세요:

[의도 분석]
사용자의 주요 의도와 목적을 파악하세요.

[엔티티 추출]
언급된 도구, 플랫폼, 수량, 시간, 대상 등 구체적인 엔티티를 추출하세요.

[실행 가능성 평가]
요청이 자동화 실행 가능한지 평가하고, 필요한 태스크를 간략히 제시하세요.`;
