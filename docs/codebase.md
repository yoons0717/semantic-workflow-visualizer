# Codebase Reference

코드베이스 구조, 데이터 흐름, 핵심 모듈, 상태관리, API Routes, 확장 가이드.

---

## 디렉터리 구조

```
src/
├── app/
│   ├── layout.tsx                    # 전역 레이아웃, 다크 테마
│   ├── page.tsx                      # 5개 패널 조합 (ResizableLayout 사용)
│   └── api/
│       ├── analyze/route.ts          # Gemini SSE 스트리밍 엔드포인트
│       ├── tasks/route.ts            # structured JSON 태스크 추출 엔드포인트
│       ├── webhook/slack/route.ts    # Slack Incoming Webhook 서버사이드 프록시
│       ├── github/pr/route.ts        # GitHub PR 데이터 조회 (제목·본문·diff)
│       └── notion/
│           ├── databases/route.ts    # Notion DB 목록 조회
│           ├── databases/[id]/route.ts  # Notion DB 스키마 (status·priority 옵션)
│           └── rows/route.ts         # Notion 페이지(이슈) 생성
│
├── components/
│   ├── __tests__/
│   ├── ResizableLayout.tsx           # 드래그 핸들 기반 그리드 레이아웃
│   ├── Panel.tsx                     # 패널 공통 래퍼
│   ├── TokenizerPanel.tsx            # GitHub PR 입력 UI (repo + PR 번호)
│   ├── NotionBrowser.tsx             # Notion 워크스페이스 DB 브라우저
│   ├── StreamingPanel.tsx            # Gemini 스트리밍 텍스트 + 마크다운 렌더링
│   ├── ErrorBanner.tsx               # 분석 실패 시 에러 메시지 + Try Again 버튼
│   ├── PromptLog.tsx                 # 시스템 프롬프트 투명성 패널
│   ├── TaskExecutor.tsx              # 태스크 카드 목록 + 전체 완료 감지
│   ├── TaskCard.tsx                  # 개별 태스크 카드 (인라인 편집, 승인/거부)
│   ├── PipelineStatus.tsx            # 상단 파이프라인 단계 바
│   ├── PipelineBadge.tsx             # 헤더 상태 뱃지
│   ├── EmptyState.tsx                # 빈 상태 공통 래퍼
│   └── Spinner.tsx
│
├── hooks/
│   ├── __tests__/
│   └── useAnalyze.ts                 # PR 분석 전체 파이프라인 훅
│
├── store/
│   ├── __tests__/
│   └── workflowStore.ts              # Zustand 전역 상태 + 액션
│
├── lib/
│   ├── gemini.ts                     # Gemini 클라이언트, 모델명, 시스템 프롬프트
│   ├── taskSchema.ts                 # Zod 스키마 — WorkflowTask 구조 검증
│   ├── mockWebhook.ts                # 태스크 실행 시뮬레이터 (Notion 제외)
│   └── notionSchema.ts               # Notion DB 스키마 조회·파싱 유틸
│
└── types/
    └── index.ts                      # WorkflowTask, PipelineStage, NotionDatabase
```

---

## 데이터 흐름 (파이프라인)

```
idle → analyzing → executing → done
                              ↘ error
```

| 단계 | 트리거 | 담당 코드 |
|---|---|---|
| `idle` | 초기 상태 | `workflowStore.ts` initialState |
| `analyzing` | "▶ Analyze PR" 클릭 | `useAnalyze.ts` → `GET /api/github/pr` → `POST /api/analyze` |
| `executing` | SSE 스트리밍 완료 후 | `useAnalyze.ts` → `POST /api/tasks` |
| `done` | 모든 태스크 완료 or 태스크 없음 | `TaskExecutor.tsx` or `useAnalyze.ts` |
| `error` | API 요청 실패 | `useAnalyze.ts` catch 블록 |

**`done` 전환이 두 곳에 있는 이유**
- 태스크가 **없을 때**: `useAnalyze.ts`에서 바로 `setStage('done')` 호출
- 태스크가 **있을 때**: `TaskExecutor.tsx`가 모든 태스크 완료를 감지해 `setStage('done')` 호출

---

## 핵심 모듈

### `lib/gemini.ts`

Gemini 클라이언트와 시스템 프롬프트를 중앙 관리합니다.

```ts
export const geminiProvider = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite';
export const SYSTEM_PROMPT = `...`;        // 일반 텍스트 분석용
export const PR_ANALYSIS_SYSTEM_PROMPT = `...`;  // PR diff 분석용
```

프롬프트를 수정하려면 해당 상수만 변경하면 됩니다. 변경 결과는 PromptLog 패널에서 바로 확인 가능합니다.

---

### `lib/mockWebhook.ts`

Slack 외 태스크(Jira · Email · Generic)의 실행을 시뮬레이션합니다. Notion 태스크는 `TaskCard`에서 직접 `/api/notion/rows`를 호출합니다.

```ts
export async function executeTask(task: WorkflowTask): Promise<{ success: boolean; message: string }>
```

---

### `lib/notionSchema.ts`

Notion DB 스키마를 조회하고 title·status·priority 컬럼을 동적으로 탐색합니다. 컬럼명이 한국어이거나 커스텀 이름이어도 type으로 매칭합니다.

```ts
export async function fetchDbSchema(databaseId: string, apiKey: string): Promise<Record<string, unknown>>
export function findTitleKey(schema): string
export function findStatusKey(schema): string | null
export function findPriorityKey(schema): string | null
export function extractOptions(prop): string[]
```

---

### `hooks/useAnalyze.ts`

PR 분석 전체 파이프라인을 조율하는 핵심 훅입니다.

```ts
const { analyzePR } = useAnalyze();
await analyzePR(repo, prNumber);
```

내부 동작:
1. 스토어 초기화 (`clearStreamedText`, `setTasks([])`, `setStage('analyzing')`)
2. `GET /api/github/pr` → PR 제목·본문·diff 수집
3. `POST /api/analyze` → Gemini SSE 스트리밍 → `appendStreamedText` 반복 호출
4. 스트리밍 완료 후 `POST /api/tasks` → `WorkflowTask[]` 추출 (제목에 `[#PR번호]` 태그 자동 추가)
5. 에러 시 `setErrorMessage` + `setStage('error')`

---

## 상태 관리 (Zustand)

`src/store/workflowStore.ts`가 유일한 전역 상태입니다.

```ts
interface WorkflowStore {
  stage: PipelineStage;                 // 현재 파이프라인 단계
  streamedText: string;                 // Gemini 응답 누적 텍스트
  tasks: WorkflowTask[];                // 추출된 태스크 목록
  promptLog: string;                    // 시스템 프롬프트 (투명성 패널용)
  errorMessage: string | null;          // 분석 실패 시 ErrorBanner에 표시할 메시지
  notionDatabases: NotionDatabase[];    // 연결된 Notion DB 목록
  githubRepo: string;                   // owner/repo 형식
  githubPrNumber: string;               // PR 번호 문자열
  notionTargetDatabaseId: string | null; // 자동 승인 대상 DB ID
  autoApproveNotion: boolean;           // true이면 notion 태스크 자동 승인
}
```

**규칙**
- 스토어에서 직접 API 호출 금지 — 반드시 훅에서 호출 후 저장
- 스트리밍 텍스트는 `setStreamedText` 대신 `appendStreamedText` 사용 (청크 누적)
- selector로 필요한 필드만 구독해 불필요한 리렌더 방지

```ts
const stage = useWorkflowStore((s) => s.stage);
```

---

## API Routes

### `POST /api/analyze`

Gemini LLM의 SSE 스트리밍 분석 결과를 반환합니다.

**요청**: `{ messages: [{ role: 'user', content: string }], mode?: 'pr' }`

**응답**: `text/plain` 스트림 + `x-prompt-log` 헤더 (사용된 system prompt)

- `mode: 'pr'`이면 `PR_ANALYSIS_SYSTEM_PROMPT` 사용, 없으면 일반 `SYSTEM_PROMPT` 사용
- AI SDK는 에러가 생겨도 HTTP 200으로 스트림을 시작하므로, `GEMINI_API_KEY` 유무를 스트림 시작 전에 먼저 체크

---

### `POST /api/tasks`

분석 텍스트에서 실행 가능한 태스크 목록을 추출합니다.

**요청**: `{ analysisText: string }`

**응답**: `WorkflowTask[]` (Gemini `json_object` mode + Zod 검증, 실패 시 `[]` 반환)

---

### `GET /api/github/pr`

GitHub REST API에서 PR 데이터를 수집합니다.

**요청**: `?repo=owner/repo&pr=123`

**응답**: `{ title, body, filesChanged, diff }` (diff는 최대 12,000자 truncate)

- `GITHUB_TOKEN` 없으면 인증 없이 요청 (공개 레포만, rate limit 60 req/h)

---

### `GET /api/notion/databases`

연결된 Notion 워크스페이스의 DB 목록을 반환합니다.

**응답**: `NotionDatabase[]` (`{ id, title, icon? }`)

---

### `GET /api/notion/databases/[id]`

특정 DB의 status·priority 옵션 목록을 반환합니다. (TaskCard 드롭다운용)

**응답**: `{ statusOptions: string[], priorityOptions: string[] }`

---

### `POST /api/notion/rows`

Notion DB에 새 페이지(이슈)를 생성합니다. DB 스키마를 동적으로 조회해 컬럼명 무관하게 매핑합니다.

**요청**: `{ database_id, title, status?, priority?, content? }`

**응답**: `{ url: string | null }`

---

### `POST /api/webhook/slack`

Slack Incoming Webhook으로 메시지를 전송하는 서버사이드 프록시입니다.

**요청**: `{ channel: string, message: string }`

**응답**: `{ ok: boolean }`

- `SLACK_WEBHOOK_URL` 없으면 즉시 `{ ok: false }` 반환

---

## 기능 확장 가이드

### 새 태스크 타입 추가 (예: `github`)

수정이 필요한 파일 4곳:

1. `src/types/index.ts` — `TaskType` 유니온에 추가
2. `src/lib/mockWebhook.ts` — Mock 실행 케이스 추가
3. `src/components/TaskCard.tsx` — 배지 색상 매핑 추가
4. `src/lib/gemini.ts` — `SYSTEM_PROMPT`에 타입 추출 예시 추가

---

### 시스템 프롬프트 수정

`src/lib/gemini.ts`의 `SYSTEM_PROMPT` 또는 `PR_ANALYSIS_SYSTEM_PROMPT` 상수를 수정합니다. 변경 결과는 PromptLog 패널(`[SYSTEM]` 섹션)에서 즉시 확인할 수 있습니다.

---

## 현재 한계

| 항목 | 현재 상태 | 영향 범위 |
|---|---|---|
| diff 크기 | 최대 12,000자 truncate | 대규모 PR 분석 품질 저하 |
| 태스크 실행 | Notion·Slack만 실제 연동, 나머지 Mock | Jira · Email 자동화 불가 |
| 태스크 타입 | 5종류 (notion · slack · jira · email · generic) | 확장 시 다중 파일 수정 필요 |
| Notion 연동 | 이슈 생성만 지원 | 기존 이슈 업데이트 불가 |
| 시스템 프롬프트 | 코드 하드코딩 | 배포 없이 수정 불가 |
