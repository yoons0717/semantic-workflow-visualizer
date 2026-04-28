# Productivity Reboot Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task.

**Goal:** 포트폴리오 데모 → 실제 개인 생산성 도구. 자연어 → Claude 분석 → Notion 생성 + GitHub 코드 리뷰 + 저장 워크플로우.

**Tech:** Next.js 16.2.2, React 19, Zustand 5, `@ai-sdk/anthropic`, `@notionhq/client`

---

## Phase 1 — Foundation

### Task 1: Type system
- `src/types/index.ts`: `TaskType`에 `notion_row | notion_page` 추가. `WorkflowTask`에 `notionPageUrl?: string` 추가. `NotionDatabase`, `SavedWorkflow` 인터페이스 추가.
- `src/lib/taskSchema.ts`: Zod enum에 `notion_row`, `notion_page` 추가.

### Task 2: Zustand store
- `src/store/workflowStore.ts`: `similarities / setSimilarities` 제거. `notionTargetDatabaseId`, `notionDatabases`, `savedWorkflows`, `githubRepo` 상태 + setter 추가.
- `src/store/__tests__/workflowStore.test.ts`: similarities 관련 테스트 제거.

### Task 3: Groq → Claude API
- `npm install @ai-sdk/anthropic && npm uninstall @ai-sdk/groq groq-sdk`
- `src/lib/claude.ts` 신규 생성 (`createAnthropic`, `CLAUDE_MODEL = 'claude-sonnet-4-6'`, `SYSTEM_PROMPT`).
- `src/app/api/analyze/route.ts`: `groqProvider` → `anthropic`, `GROQ_API_KEY` → `ANTHROPIC_API_KEY`.
- `src/app/api/tasks/route.ts`: 동일 교체 + 프롬프트에 `notion_row / notion_page` 타입 규칙 추가 (payload: `database_id: "__selected__"` 플레이스홀더). `providerOptions.groq` 제거.
- `src/lib/groq.ts` 삭제.
- `.env.local`에 `ANTHROPIC_API_KEY` 추가.

### Task 4: VectorMap 제거 + useAnalyze 정리
- `src/components/VectorMap.tsx`, `src/hooks/useVectorSimulation.ts`, `src/app/api/embeddings/route.ts` 삭제.
- `npm uninstall d3 @types/d3`
- `src/hooks/useAnalyze.ts`: `fetchEmbeddings` 함수 및 호출, `setSimilarities` 의존성 제거.
- `src/hooks/__tests__/useAnalyze.test.ts`: embeddings 목 및 similarities 테스트 제거.
- `src/components/ResizableLayout.tsx`: VectorMap import/사용 제거, COL3 ROW1 패널을 빈 `<div />`로 임시 대체. COL2 ROW1 badge를 `"Claude Sonnet"`으로 변경.

**검증:** `npm test` 통과, `npx tsc --noEmit` 오류 없음, 앱 로드 후 Claude 스트리밍 동작 확인.

---

## Phase 2 — Notion Integration

### Task 5: Notion API 라우트
- `npm install @notionhq/client`
- `src/app/api/notion/databases/route.ts`: `GET` — `notion.search({ filter: { value: 'database' } })` 후 `{ id, title, icon }` 배열 반환.
- `src/app/api/notion/rows/route.ts`: `POST { databaseId, title, properties }` — `notion.pages.create` (parent: database_id). 응답에 `{ id, url }` 포함.
- `src/app/api/notion/pages/route.ts`: `POST { parentPageId, title, content }` — `notion.pages.create` (parent: page_id). 응답에 `{ id, url }` 포함.
- `.env.local`에 `NOTION_API_KEY` 추가.

### Task 6: NotionBrowser 컴포넌트
- `src/components/NotionBrowser.tsx` 신규: 마운트 시 `/api/notion/databases` fetch → DB 목록 표시 → 클릭 시 `setNotionTargetDatabaseId`. 키 미설정 시 EmptyState.
- `src/components/ResizableLayout.tsx`: COL3 ROW1 패널을 `title="Notion Workspace" badge="Notion API"`로 교체, 안에 `<NotionBrowser />` 삽입.

### Task 7: Notion 태스크 실행
- `src/lib/mockWebhook.ts`: `notion_row / notion_page`를 `MOCK_DELAYS`에 추가. `executeNotionRow` / `executeNotionPage` 함수 추가 (각 API 라우트 호출 → 실패 시 mock fallback). `WebhookResult`에 `notionUrl?: string` 추가.
- `src/components/TaskCard.tsx`: `TYPE_COLORS`에 `notion_row / notion_page` 추가. success 시 `task.notionPageUrl`이 있으면 "View in Notion ↗" 링크 표시.
- `src/components/TaskExecutor.tsx`: `handleApprove`에서 `notion_row` 태스크 + `database_id === '__selected__'` 일 때 store의 `notionTargetDatabaseId`로 교체. `updateTask` success 시 `notionPageUrl` 포함.

**검증:** "버튼 클릭 모바일에서 안 돼, Notion 이슈 만들어줘" 입력 → notion_row 태스크 생성 → 승인 → Notion DB에 실제 항목 확인.

---

## Phase 3 — GitHub + Saved Workflows

### Task 8: GitHub API 라우트 + 헤더 입력
- `src/app/api/github/files/route.ts`: `POST { repo, since? }` — 최근 7일 커밋 → 변경 파일 목록(ts/tsx/js/py 등, 최대 5개) → 각 파일 내용 fetch(base64 decode, 2000자 truncate). `{ files: [{path, content}], summary }` 반환.
- `src/components/GitHubRepoInput.tsx` 신규: store의 `githubRepo`를 읽고 쓰는 input (placeholder: `owner/repo`).
- `src/app/page.tsx`: `GitHubRepoInput` import 후 헤더에 추가. badge "GROQ API" → "Claude Sonnet". 버전 `v0.2.0`.
- `.env.local`에 `GITHUB_TOKEN` 추가.

### Task 9: SavedWorkflows 컴포넌트 + 레이아웃 마무리
- `src/components/SavedWorkflows.tsx` 신규:
  - `localStorage("swv-saved-workflows")`에서 마운트 시 로드.
  - "+ Save" 버튼: 현재 input + githubRepo로 SavedWorkflow 생성 (prompt로 이름 입력).
  - 목록 카드: 이름, githubRepo, 마지막 실행일, 실행 횟수. Load / ▶ / × 버튼.
  - ▶ 재실행: githubRepo 있으면 `/api/github/files` fetch → 코드 컨텍스트를 프롬프트 앞에 prepend → `analyze(prompt)` 호출. 실행 횟수 + lastRunAt 갱신.
- `src/components/ResizableLayout.tsx`: 하단 행 분리.
  - TaskExecutor 패널: `className`에 `md:[grid-column:2/5]` 추가 (center+handle 영역 점유).
  - SavedWorkflows 패널 추가: COL5 ROW3 위치 (자동 배치됨).

**검증:** "Morning Code Review" 워크플로우 저장 (owner/repo 포함) → ▶ 클릭 → GitHub 파일 fetch → 분석 → notion_row 태스크들 생성 → 일괄 승인 → Notion DB 이슈 생성 확인.

---

## 파일 요약

| 작업 | 파일 |
|------|------|
| 삭제 | `VectorMap.tsx`, `useVectorSimulation.ts`, `api/embeddings/route.ts`, `lib/groq.ts` |
| 신규 | `lib/claude.ts`, `NotionBrowser.tsx`, `SavedWorkflows.tsx`, `GitHubRepoInput.tsx`, `api/notion/**`, `api/github/files/route.ts` |
| 수정 | `types/index.ts`, `lib/taskSchema.ts`, `workflowStore.ts`, `api/analyze`, `api/tasks`, `useAnalyze.ts`, `mockWebhook.ts`, `TaskCard.tsx`, `TaskExecutor.tsx`, `ResizableLayout.tsx`, `page.tsx` |
