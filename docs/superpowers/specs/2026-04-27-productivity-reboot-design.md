# Productivity Reboot — Design Spec

**Date:** 2026-04-27
**Branch:** feature/productivity-reboot (to be created)

---

## Context

현재 앱은 포트폴리오 데모로 설계되어 D3 벡터맵, Jina AI 임베딩 등 기술 시연용 요소가 포함되어 있다. 이를 실제 개인 생산성 도구로 전환한다.

핵심 가치: 자연어로 의도를 입력 → LLM이 구조화된 태스크 추출 → Notion에 실제 항목 생성.
주요 사용 시나리오: 매일 아침 GitHub 레포의 최근 변경사항을 Claude가 분석해 Notion 이슈를 자동 생성하는 워크플로우.

---

## 제거 항목

| 항목 | 이유 |
|------|------|
| VectorMap (D3 force sim) | 기술 시연용, 실사용 가치 없음 |
| Jina AI embeddings API | VectorMap 의존성 |
| Zustand `similarities` 상태 | VectorMap 의존성 |

---

## Phase 1 — 기반 정리

### 1.1 벡터맵 제거
- `src/components/VectorMap.tsx` 삭제
- `src/app/api/embeddings/route.ts` 삭제
- `src/store/workflowStore.ts`에서 `similarities` 상태 제거
- 레이아웃에서 `<VectorMap />` 참조 제거

### 1.2 LLM 교체: Groq → Claude API

| | Before | After |
|-|--------|-------|
| Provider | Groq | Anthropic |
| Model | llama-3.3-70b-versatile | claude-sonnet-4-6 |
| Package | `@ai-sdk/groq` | `@ai-sdk/anthropic` |
| 환경변수 | `GROQ_API_KEY` | `ANTHROPIC_API_KEY` |

대상 파일: `src/app/api/analyze/route.ts`, `src/app/api/tasks/route.ts`

---

## Phase 2 — Notion 통합

### 2.1 Notion API 설정

```
환경변수:
  NOTION_API_KEY=secret_xxx
```

신규 API 라우트:
- `GET /api/notion/databases` — 연결된 DB 목록 반환
- `POST /api/notion/rows` — DB row 생성
- `POST /api/notion/pages` — 페이지 생성

패키지: `@notionhq/client`

### 2.2 Notion 워크스페이스 브라우저 (중앙 상단)

VectorMap 자리를 대체하는 `NotionBrowser` 컴포넌트.

**동작:**
1. 마운트 시 `/api/notion/databases` 호출
2. 연결된 DB 목록 + 아이콘 표시
3. 사용자가 "기본 대상" DB 선택 → Zustand에 저장
4. TaskExecutor 카드에서 선택된 DB 표시

**상태 (Zustand):**
```ts
notionTargetDatabaseId: string | null
notionDatabases: NotionDatabase[]
```

### 2.3 태스크 타입 확장

```ts
// 기존
type TaskType = 'slack' | 'jira' | 'email' | 'generic'

// 추가
type TaskType = 'slack' | 'jira' | 'email' | 'generic' | 'notion_row' | 'notion_page'
```

LLM 판단 기준:
- 구조화된 데이터 (버그, 이슈, 할 일) → `notion_row`
- 자유형식 문서 (리포트, 노트, 설명) → `notion_page`

Payload 스키마:
```ts
// notion_row
{ database_id: string, title: string, properties: Record<string, string> }

// notion_page
{ parent_page_id: string, title: string, content: string }
```

### 2.4 태스크 실행

승인 시 → `/api/notion/rows` 또는 `/api/notion/pages` 호출
성공 시 → TaskExecutor 카드에 Notion 페이지 URL 클릭 가능 링크 표시

---

## Phase 3 — GitHub + 저장 워크플로우

### 3.1 GitHub 레포 연결

```
환경변수:
  GITHUB_TOKEN=ghp_xxx
```

신규 API 라우트: `POST /api/github/files`
- Body: `{ repo: 'owner/repo', since?: ISO8601 }`
- 최근 7일간 변경된 파일 목록 + 내용 반환

UI: 헤더 영역에 레포 입력 필드 (`owner/repo` 형식)

### 3.2 저장 워크플로우

저장소: `localStorage` (백엔드 DB 불필요)

데이터 모델:
```ts
interface SavedWorkflow {
  id: string
  name: string
  prompt: string
  githubRepo?: string
  createdAt: number
  lastRunAt?: number
  runCount: number
}
```

UI 위치: 오른쪽 컬럼 하단 (PromptLog + TaskExecutor 아래 `SavedWorkflows` 컴포넌트)

기능:
- 현재 프롬프트 이름 붙여 저장
- 클릭 → TokenizerPanel에 불러오기
- 재실행 버튼 → 원클릭 전체 파이프라인 실행
- 마지막 실행 시간 + 실행 횟수 표시

### 3.3 아침 코드 리뷰 워크플로우 (주요 시나리오)

`githubRepo`가 설정된 SavedWorkflow 재실행 시:
1. `/api/github/files`로 최근 변경 파일 fetch
2. 파일 내용을 프롬프트 앞에 prepend
3. 파이프라인 실행 (시스템 프롬프트: 코드 리뷰어 역할 + Notion 이슈 생성 지시)
4. 결과: `notion_row` 태스크 다수 생성
5. 일괄 승인 → Notion DB에 이슈 자동 생성

---

## UI 레이아웃 (변경 후)

```
┌──────────────────────────────────────────────────────────────────┐
│ Pipeline Status │ GitHub: [owner/repo____] │ [Claude Sonnet]     │
├────────────────┬──────────────────────────┬──────────────────────┤
│                │  Notion Workspace         │  PromptLog           │
│  Tokenizer     │  Browser                  ├──────────────────────┤
│  Panel         ├──────────────────────────┤  TaskExecutor        │
│                │  Streaming Panel          ├──────────────────────┤
│                │                           │  Saved Workflows     │
└────────────────┴──────────────────────────┴──────────────────────┘
```

---

## 기술 스택 변경 요약

| 항목 | Before | After |
|------|--------|-------|
| LLM | Groq llama-3.3-70b | Claude Sonnet (claude-sonnet-4-6) |
| Embeddings | Jina AI | 제거 |
| 시각화 | D3.js force sim | 제거 |
| 통합 서비스 | Slack only | Slack + Notion |
| 영속성 | 없음 | localStorage |
| 코드 접근 | 없음 | GitHub API (PAT) |

---

## 주요 파일

**삭제:**
- `src/components/VectorMap.tsx`
- `src/app/api/embeddings/route.ts`

**수정:**
- `src/app/api/analyze/route.ts`
- `src/app/api/tasks/route.ts`
- `src/store/workflowStore.ts`
- 레이아웃 루트 (VectorMap → NotionBrowser 교체)

**신규:**
- `src/components/NotionBrowser.tsx`
- `src/components/SavedWorkflows.tsx`
- `src/app/api/notion/databases/route.ts`
- `src/app/api/notion/rows/route.ts`
- `src/app/api/notion/pages/route.ts`
- `src/app/api/github/files/route.ts`

---

## 검증 계획

**Phase 1 완료 후:**
- D3/Jina 관련 에러 없이 앱 로드
- Claude API로 스트리밍 분석 정상 동작

**Phase 2 완료 후:**
- "버튼 클릭이 모바일에서 안 돼요, Notion 이슈 만들어줘" 입력
- Notion 브라우저에서 DB 선택
- 승인 → Notion DB에 실제 항목 생성 확인
- Slack 태스크도 여전히 동작

**Phase 3 완료 후:**
- "Morning Code Review" 워크플로우 저장 (`owner/repo` 포함)
- 재실행 버튼 클릭 → GitHub fetch → 분석 → Notion 이슈 생성
- 저장 워크플로우에 마지막 실행 시간 + 실행 횟수 표시
