# Semantic Workflow Visualizer — Implementation Plan

**Goal:** LLM 동작 원리(토큰화, 시맨틱 분석)를 시각화하고 업무 자동화로 연결하는 엔지니어링 대시보드

**Architecture:** Next.js App Router 기반. 서버 컴포넌트는 데이터 패칭, 클라이언트 컴포넌트는 인터랙션/시각화 전담.

---

## Tech Stack

| 기술 | 선택 이유 |
|---|---|
| Next.js 15 (App Router) | 서버/클라이언트 컴포넌트 분리로 LLM 스트리밍 최적화 |
| Vercel AI SDK + Groq | SSE 스트리밍 추상화, Groq 무료 티어 사용 |
| gpt-tokenizer | 브라우저에서 직접 토큰화 — LLM API 호출 없이 비용 제로, WASM 불필요 |
| Zustand | 비동기 파이프라인 상태 관리, 보일러플레이트 최소 |
| TanStack Query | 서버 상태 캐싱 및 태스크 API 요청 관리 |
| D3.js | 벡터 유사도 force simulation 자유도 높음 |

---

## File Structure

```
src/
├── app/           # 라우트, API routes (SSE 스트리밍 엔드포인트 포함)
├── components/    # UI 컴포넌트 (전부 "use client")
├── store/         # Zustand 전역 상태
├── types/         # TypeScript 타입 정의
├── lib/           # 유틸, Groq 클라이언트, mock webhook
└── hooks/         # TanStack Query 커스텀 훅
```

---

## Phase 0: 프로젝트 초기화 ✅

### Task 1: 프로젝트 셋업
- [x] `npx create-next-app@latest` (TypeScript, Tailwind, App Router, src dir)
- [x] 의존성 설치: `zustand @tanstack/react-query ai groq-sdk gpt-tokenizer d3 @types/d3`
- [x] `next.config.ts` — `serverExternalPackages: ['groq-sdk']` 설정
- [x] `src/types/index.ts` — Token, WorkflowTask, PipelineStage, WorkflowState 타입 정의

---

## Phase 1: MVP ✅

### Task 2: 레이아웃 + 상태
- [x] `src/store/workflowStore.ts` — 파이프라인 전역 상태 + 액션
- [x] `src/app/layout.tsx` — 다크 테마, QueryClientProvider
- [x] `src/app/page.tsx` — 3열 그리드 대시보드

### Task 3: Live Tokenizer
- [x] `src/lib/tokenizer.ts` — gpt-tokenizer `cl100k_base` 래퍼
- [x] `src/components/TokenizerPanel.tsx` — 실시간 입력 → 토큰 그리드 (ID + 색상)

### Task 4: Groq 스트리밍 + 파이프라인
- [x] `src/lib/groq.ts` — Groq 클라이언트 설정
- [x] `src/app/api/analyze/route.ts` — `streamText` SSE 엔드포인트 (`toTextStreamResponse`)
- [x] `src/hooks/useAnalyze.ts` — fetch + ReadableStream 수동 스트리밍 (`useChat` 대신)
- [x] `src/components/StreamingPanel.tsx` — 스트리밍 텍스트 실시간 렌더링
- [x] `src/components/PipelineStatus.tsx` — [입력→토큰화→분석→실행] 단계 표시

---

## Phase 2: 시맨틱 레이어 ✅

### Task 5: Vector Space 시각화
- [x] `src/lib/knowledge.ts` — 지식베이스 10개 항목 + 텍스트 기반 Jaccard 유사도 + cosineSimilarity
- [x] `src/components/VectorMap.tsx` — D3 force simulation, 카테고리별 색상, 분석 시작 후 활성화

### Task 6: Prompt 투명성 패널
- [x] `src/components/PromptLog.tsx` — [SYSTEM] 파란색 / [USER] accent 색 구분 표시
- [x] `src/app/api/analyze/route.ts` — `x-prompt-log` 헤더에 `encodeURIComponent` 적용 (한국어 인코딩)

---

## Phase 3: 실행 레이어

### Task 7: Task 추출
- [ ] `src/app/api/tasks/route.ts` — structured output으로 JSON 태스크 추출
- [ ] `src/components/TaskCard.tsx` — 태스크 카드 (payload 인라인 편집)

### Task 8: Mock 실행 + 승인 UI
- [ ] `src/lib/mockWebhook.ts` — Slack/Jira Mock (딜레이 + 성공 응답)
- [ ] `src/components/TaskExecutor.tsx` — 승인/거부 + 실행 상태

---

## Phase 4: 배포

### Task 9: Vercel 배포
- [ ] Vercel 연동 + 환경변수 설정

---

## 환경 변수

```
GROQ_API_KEY=gsk_...
```

## 주의사항

- D3 컴포넌트는 `"use client"` 선언 필수, DOM 조작은 `useEffect` 내부에서만
- Groq 무료 rate limit (분당 30req) → 입력 debounce 500ms 적용
- `serverExternalPackages: ['groq-sdk']` — `next.config.ts` 설정 필수
