# Code Conventions — Semantic Workflow Visualizer

## 1. 파일 & 디렉토리

```
src/
├── app/           # 라우트, API routes
├── components/    # UI 컴포넌트 (모두 "use client")
├── store/         # Zustand 전역 상태
├── types/         # TypeScript 타입 (index.ts 단일 진입점)
├── lib/           # 순수 유틸 / 외부 클라이언트 래퍼
└── hooks/         # 커스텀 훅 (useAnalyze 등)
```

- 컴포넌트 파일: `PascalCase.tsx`
- 유틸 / 훅 / 스토어: `camelCase.ts`
- 라우트 파일: Next.js 컨벤션 (`page.tsx`, `layout.tsx`, `route.ts`)

---

## 2. 컴포넌트

```tsx
// ✅ 항상 named export
export function TokenizerPanel() { ... }

// ❌ default export 사용 안 함 (app/ 라우트 파일 제외)
export default function TokenizerPanel() { ... }
```

- 모든 `src/components/` 파일 첫 줄에 `"use client"` 선언
- D3 / tiktoken 등 브라우저 전용 코드는 `useEffect` 내부에서만 실행
- Props 타입은 컴포넌트 바로 위에 인라인 정의

```tsx
interface Props {
  tokens: Token[];
  onClear: () => void;
}

export function TokenizerPanel({ tokens, onClear }: Props) { ... }
```

---

## 3. 타입

- 모든 공유 타입은 `src/types/index.ts`에서 관리
- `interface` — 객체 형태 (확장 가능성)
- `type` — 유니온, 유틸리티, 단순 별칭

```ts
// ✅
export interface WorkflowTask { ... }
export type PipelineStage = 'idle' | 'analyzing' | 'done';

// ❌ any 사용 금지
const data: any = ...
```

- `Record<string, string>` 대신 구체적인 타입 선호
- 타입 단언(`as`) 은 외부 API 응답 파싱 시에만 허용

---

## 4. Zustand 스토어

```ts
// src/store/workflowStore.ts
interface WorkflowStore extends WorkflowState {
  setInput: (input: string) => void;
  setStage: (stage: PipelineStage) => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  ...initialState,
  setInput: (input) => set({ input }),
}));
```

- 스토어 파일 1개 = 관심사 1개
- 액션 이름: `set*`, `reset*`, `add*`, `remove*`
- 스토어에서 직접 API 호출 금지 — 훅이나 컴포넌트에서 호출 후 스토어에 저장

---

## 5. 커스텀 훅

```ts
// src/hooks/useAnalyze.ts
export function useAnalyze() {
  const store = useWorkflowStore();

  const analyze = async (input: string) => {
    store.setStage('analyzing');
    // fetch 직접 호출 후 스토어에 저장
  };

  return { analyze };
}
```

- 훅 파일명: `use*.ts`
- API 호출은 훅에서만 수행, 결과는 Zustand 스토어에 저장
- 컴포넌트에서 직접 `fetch` 금지

---

## 6. API Routes (App Router)

```ts
// src/app/api/analyze/route.ts
export async function POST(req: Request) {
  const { input } = await req.json();
  // ...
}
```

- HTTP 메서드는 named export (`GET`, `POST`, `PUT`, `DELETE`)
- 에러 응답: `Response.json({ error: '...' }, { status: 4xx })`
- 스트리밍 응답: Vercel AI SDK `streamText` + `toTextStreamResponse()` (클라이언트가 raw TextDecoder로 직접 파싱하는 경우)

---

## 7. 스타일 (Tailwind)

- 클래스 순서: layout → box model → typography → color → animation
- 디자인 토큰 (색상, 폰트)은 `tailwind.config.ts`의 `extend`에 정의
- 인라인 `style={{}}` 은 D3 동적 값에만 사용

```tsx
// ✅
<div className="flex items-center gap-2 text-sm text-text-sec bg-bg-panel" />

// ❌
<div style={{ display: 'flex', color: '#6b7fa3' }} />
```

---

## 8. 네이밍

| 대상 | 규칙 | 예시 |
|---|---|---|
| 컴포넌트 | PascalCase | `StreamingPanel` |
| 훅 | camelCase, `use` 접두사 | `useWorkflowStore` |
| 유틸 함수 | camelCase | `cosineSimilarity` |
| 상수 | UPPER_SNAKE_CASE | `MAX_TOKENS` |
| 타입/인터페이스 | PascalCase | `WorkflowTask` |
| CSS 변수 | `--kebab-case` | `--bg-panel` |

---

## 9. Import 순서

```ts
// 1. React / Next.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. 외부 라이브러리
import { create } from 'zustand';
import * as d3 from 'd3';

// 3. 내부 — 타입
import type { Token, WorkflowTask } from '@/types';

// 4. 내부 — 모듈
import { useWorkflowStore } from '@/store/workflowStore';
import { cosineSimilarity } from '@/lib/knowledge';
```

---

## 10. 금지 사항

- `console.log` 운영 코드에 잔류 금지 (디버그 후 제거)
- `any` 타입 금지
- `// @ts-ignore` 금지 (`// @ts-expect-error` + 이유 주석으로 대체)
- 컴포넌트 내 직접 `fetch` 금지 — 반드시 훅으로 추상화
- `useEffect` 의존성 배열 임의 생략 금지
