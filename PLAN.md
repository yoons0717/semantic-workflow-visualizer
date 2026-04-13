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
- [x] `src/app/api/tasks/route.ts` — structured output으로 JSON 태스크 추출
- [x] `src/components/TaskCard.tsx` — 태스크 카드 (payload 인라인 편집)

### Task 8: Mock 실행 + 승인 UI
- [x] `src/lib/mockWebhook.ts` — Slack/Jira Mock (딜레이 + 성공 응답)
- [x] `src/components/TaskExecutor.tsx` — 승인/거부 + 실행 상태

---

## Phase 4: 배포

### Task 9: Vercel 배포
- [x] Vercel 연동 + 환경변수 설정

---

## 환경 변수

```
GROQ_API_KEY=gsk_...
```

## 주의사항

- D3 컴포넌트는 `"use client"` 선언 필수, DOM 조작은 `useEffect` 내부에서만
- Groq 무료 rate limit (분당 30req) → 입력 debounce 500ms 적용
- `serverExternalPackages: ['groq-sdk']` — `next.config.ts` 설정 필수

---

## Phase 5: 태스크 파싱 견고성

**목적:** regex 기반 JSON 파싱 → AI SDK `generateObject` + Zod 스키마 검증으로 교체

### Task 10: Zod 스키마 + generateObject

- [x] `npm install zod` (이미 의존성으로 포함 — zod 4.3.6)
- [x] `src/lib/taskSchema.ts` (신규) — `WorkflowTaskSchema`, `WorkflowTaskArraySchema` 정의
- [x] `src/app/api/tasks/route.ts` — `generateText` + regex 블록 제거, `generateObject({ schema: z.object({ tasks: WorkflowTaskArraySchema }) })` 로 교체
- [x] 검증 실패 시 catch → `[]` 반환 유지

---

## Phase 6: 진짜 Semantic — Jina AI 임베딩

**목적:** VectorMap을 실제 코사인 유사도로 구동 — 프로젝트 이름 "Semantic" 정당화

### Task 11: 임베딩 API 연동

- [x] `src/app/api/embeddings/route.ts` (신규)
  - module-level 캐시: `Map<string, number[]>` — 10개 knowledge item, cold start 1회 계산 후 재사용
  - POST `{ text: string }` → Jina `jina-embeddings-v3` 호출 → `Record<id, number>` 반환
  - `JINA_API_KEY` 없으면 `{}` 반환 (graceful degradation)
- [x] `src/lib/knowledge.ts` — `computeSimilarities` (Jaccard) 제거, 각 항목에 `description` 필드 추가, `vector`/`keywords` 필드 제거
- [x] `src/store/workflowStore.ts` — `similarities: Record<string, number>` 상태 + `setSimilarities` 액션 추가, `reset()`에 포함
- [x] `src/hooks/useAnalyze.ts` — `/api/analyze` 와 `/api/embeddings` 병렬 실행, 결과 → `setSimilarities`
- [x] `src/components/VectorMap.tsx` — 클라이언트 Jaccard 제거, `store.similarities` 읽기, `similarities` 변경 시 D3 transition 600ms 업데이트, fallback: 비어있으면 uniform 0.1
- [x] Vector Space 패널 배지 `"Cosine Similarity"` → `"Jina Embeddings"` 변경

**환경 변수 추가:**
```
JINA_API_KEY=jina_...
```

---

## Phase 7: 진짜 Slack 연동

**목적:** Slack 태스크 승인 시 실제 메시지 전송, Live/Mock 구분 표시

### Task 12: Slack Proxy Route + TaskCard 배지

- [ ] `src/app/api/webhook/slack/route.ts` (신규) — Slack Incoming Webhook 서버사이드 프록시 (`SLACK_WEBHOOK_URL` 없으면 mock fallback)
- [ ] `src/types/index.ts` — `WorkflowTask`에 `executionMode?: 'live' | 'mock'` 필드 추가
- [ ] `src/lib/mockWebhook.ts` — Slack 타입은 `/api/webhook/slack` 호출, 나머지는 기존 mock 유지, 반환값에 `mode: 'live' | 'mock'` 추가
- [ ] `src/components/TaskExecutor.tsx` — `executeTask` 완료 후 `updateTask({ executionMode: result.mode })`
- [ ] `src/components/TaskCard.tsx` — `status === 'success'` 시 `executionMode` 에 따라 `LIVE`(녹색) / `MOCK`(회색) 배지 표시

**환경 변수 추가:**
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## Phase 8: UX 개선

### Task 13: 에러 상태 UX

- [ ] `src/store/workflowStore.ts` — `errorMessage: string | null` 상태 + `setErrorMessage` 액션 추가
- [ ] `src/hooks/useAnalyze.ts` — catch 블록에서 `setErrorMessage(humanReadableError(err))` 호출 (네트워크 오류 / API key 없음 / 태스크 추출 실패 구분)
- [ ] `src/components/ErrorBanner.tsx` (신규) — `stage === 'error'` 시 렌더링, "Try Again" → `reset()`
- [ ] `src/components/StreamingPanel.tsx` — `<ErrorBanner />` 조건부 렌더링

### Task 14: VectorMap 노드 툴팁

- [ ] `src/components/VectorMap.tsx` — `pointerenter` / `pointerleave` 이벤트 추가, React state로 툴팁 위치/내용 관리
- [ ] 툴팁 내용: `label`, `category`(색상), 코사인 유사도 점수, `description`

---

## 환경 변수 최종 목록

```
GROQ_API_KEY=gsk_...        # 기존
JINA_API_KEY=jina_...       # Phase 6 신규
SLACK_WEBHOOK_URL=https://  # Phase 7 신규
```
