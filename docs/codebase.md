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
│       ├── analyze/route.ts          # SSE 스트리밍 엔드포인트
│       ├── embeddings/route.ts       # Jina AI 임베딩 + 코사인 유사도 계산
│       ├── tasks/route.ts            # structured JSON 태스크 추출 엔드포인트
│       └── webhook/slack/route.ts    # Slack Incoming Webhook 서버사이드 프록시
│
├── components/
│   ├── __tests__/
│   ├── ResizableLayout.tsx           # 드래그 핸들 기반 그리드 레이아웃
│   ├── Panel.tsx                     # 패널 공통 래퍼
│   ├── TokenizerPanel.tsx            # 실시간 토크나이저 UI
│   ├── VectorMap.tsx                 # D3 force simulation + 노드 툴팁
│   ├── StreamingPanel.tsx            # LLM 스트리밍 텍스트 + 커스텀 마크다운 렌더링
│   ├── ErrorBanner.tsx               # 분석 실패 시 에러 메시지 + Try Again 버튼
│   ├── PromptLog.tsx                 # 시스템 프롬프트 투명성 패널
│   ├── TaskExecutor.tsx              # 태스크 카드 목록 + 전체 완료 감지
│   ├── TaskCard.tsx                  # 개별 태스크 카드 (인라인 편집, 승인/거부)
│   ├── PipelineStatus.tsx            # 상단 파이프라인 단계 바
│   ├── EmptyState.tsx                # 빈 상태 공통 래퍼
│   └── Spinner.tsx
│
├── hooks/
│   ├── __tests__/
│   └── useAnalyze.ts                 # 분석 전체 파이프라인 훅
│
├── store/
│   ├── __tests__/
│   └── workflowStore.ts              # Zustand 전역 상태 + 액션
│
├── lib/
│   ├── __tests__/
│   ├── groq.ts                       # Groq 클라이언트, 모델명, 시스템 프롬프트
│   ├── tokenizer.ts                  # gpt-tokenizer cl100k_base 래퍼
│   ├── knowledge.ts                  # 워크플로우 지식베이스 + 코사인 유사도 함수
│   ├── taskSchema.ts                 # Zod 스키마 — WorkflowTask 구조 검증
│   └── mockWebhook.ts                # 태스크 실행 시뮬레이터
│
└── types/
    └── index.ts                      # Token, WorkflowTask, PipelineStage, WorkflowState
```

---

## 데이터 흐름 (파이프라인)

```
idle → tokenizing → analyzing → executing → done
                                           ↘ error
```

| 단계 | 트리거 | 담당 코드 |
|---|---|---|
| `idle` | 초기 상태 | `workflowStore.ts` initialState |
| `tokenizing` | 텍스트 입력 시 | `TokenizerPanel.tsx` → `tokenizer.ts` |
| `analyzing` | "Start Analysis" 클릭 | `useAnalyze.ts` → `POST /api/analyze` |
| `executing` | SSE 스트리밍 완료 후 | `useAnalyze.ts` → `POST /api/tasks` |
| `done` | 모든 태스크 완료 or 태스크 없음 | `TaskExecutor.tsx` or `useAnalyze.ts` |
| `error` | API 요청 실패 | `useAnalyze.ts` catch 블록 |

**`done` 전환이 두 곳에 있는 이유**
- 태스크가 **없을 때**: `useAnalyze.ts`에서 바로 `setStage('done')` 호출
- 태스크가 **있을 때**: `TaskExecutor.tsx`가 모든 태스크 완료를 감지해 `setStage('done')` 호출

---

## 핵심 모듈

### `lib/groq.ts`

Groq 클라이언트와 시스템 프롬프트를 중앙 관리합니다.

```ts
export const groqProvider = createGroq({ apiKey: process.env.GROQ_API_KEY });
export const GROQ_MODEL = 'llama-3.3-70b-versatile';
export const SYSTEM_PROMPT = `...`;
```

프롬프트를 수정하려면 `SYSTEM_PROMPT` 상수만 변경하면 됩니다. 변경 결과는 PromptLog 패널에서 바로 확인 가능합니다.

---

### `lib/knowledge.ts`

워크플로우 지식베이스(10개 항목)와 코사인 유사도 함수를 제공합니다.

```ts
export const KNOWLEDGE_BASE: KnowledgeItem[];
export function cosineSimilarity(a: number[], b: number[]): number
```

`cosineSimilarity`는 `/api/embeddings`에서 Jina AI 임베딩 벡터 간 유사도 계산에 사용됩니다.

---

### `lib/mockWebhook.ts`

Jira · Email · Generic 태스크 실행을 시뮬레이션합니다. Slack은 `SLACK_WEBHOOK_URL`이 있으면 `/api/webhook/slack`으로 실제 전송합니다.

```ts
export async function executeTask(task: WorkflowTask): Promise<{ success: boolean; message: string }>
```

---

### `hooks/useAnalyze.ts`

전체 분석 파이프라인을 조율하는 핵심 훅입니다.

```ts
const { analyze } = useAnalyze();
await analyze(inputText);
```

내부 동작:
1. 스토어 초기화 (`clearStreamedText`, `setTasks([])`, `setStage('analyzing')`)
2. `POST /api/analyze` → SSE 스트리밍 → `appendStreamedText` 반복 호출
3. `POST /api/embeddings` 병렬 호출 (fire-and-forget) → `setSimilarities`
4. 스트리밍 완료 후 `POST /api/tasks` → `WorkflowTask[]` 추출
5. 에러 시 `setErrorMessage` + `setStage('error')`

> `useChat`을 쓰지 않는 이유: 응답 헤더(`x-prompt-log`)에 접근하는 API가 없어서 fetch를 직접 사용합니다.

---

### `components/VectorMap.tsx`

D3 force simulation으로 워크플로우 노드와 입력 노드 간 유사도를 시각화합니다.

- `analyzing` 단계 시작 시 초기화 (fallback 유사도 0.1)
- `/api/embeddings` 결과 도착 시 노드 크기·링크 굵기·투명도를 600ms transition으로 갱신
- 유사도 0.05 미만 링크는 투명 처리
- `idle`, `error` stage에서는 EmptyState 표시
- 노드 hover 시 툴팁 표시 (label, category, 유사도 점수, description). 입력 노드는 제외.

---

## 상태 관리 (Zustand)

`src/store/workflowStore.ts`가 유일한 전역 상태입니다.

```ts
interface WorkflowStore {
  input: string;                        // 사용자 입력 원문
  tokens: Token[];                      // 토큰화 결과
  stage: PipelineStage;                 // 현재 파이프라인 단계
  streamedText: string;                 // LLM 응답 누적 텍스트
  tasks: WorkflowTask[];                // 추출된 태스크 목록
  promptLog: string;                    // 시스템 프롬프트 (투명성 패널용)
  similarities: Record<string, number>; // knowledge item id → 코사인 유사도
  errorMessage: string | null;          // 분석 실패 시 ErrorBanner에 표시할 메시지
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

Groq LLM의 SSE 스트리밍 분석 결과를 반환합니다.

**요청**: `{ messages: [{ role: 'user', content: string }] }`

**응답**: `text/plain` 스트림 + `x-prompt-log` 헤더

> Vercel AI SDK는 에러가 생겨도 HTTP 200으로 스트림을 시작하므로, `GROQ_API_KEY` 유무를 스트림 시작 전에 먼저 체크합니다.

---

### `POST /api/embeddings`

입력 텍스트와 지식베이스 항목 간 코사인 유사도를 계산합니다.

**요청**: `{ text: string }`

**응답**: `{ similarities: { [id]: number } }`

- `JINA_API_KEY` 없으면 즉시 `{ similarities: {} }` 반환
- 지식베이스 임베딩은 서버 인스턴스에 캐싱 (cold start 1회만 계산)

---

### `POST /api/tasks`

분석 텍스트에서 실행 가능한 태스크 목록을 추출합니다.

**요청**: `{ analysisText: string }`

**응답**: `WorkflowTask[]` (Groq `json_object` mode + Zod 검증, 실패 시 `[]` 반환)

---

### `POST /api/webhook/slack`

Slack Incoming Webhook으로 메시지를 전송하는 서버사이드 프록시입니다.

**요청**: `{ channel: string, message: string }`

**응답**: `{ ok: boolean }`

- `SLACK_WEBHOOK_URL` 없으면 즉시 `{ ok: false }` 반환
- Webhook URL을 클라이언트에 노출하지 않기 위한 프록시 구조

---

## 기능 확장 가이드

### 새 태스크 타입 추가 (예: `github`)

수정이 필요한 파일 4곳:

1. `src/types/index.ts` — 타입 유니온에 추가
2. `src/lib/mockWebhook.ts` — Mock 실행 케이스 추가
3. `src/components/TaskCard.tsx` — 배지 색상 매핑 추가
4. `src/lib/groq.ts` — `SYSTEM_PROMPT`에 타입 추출 예시 추가

---

### 워크플로우 지식베이스 항목 추가

`src/lib/knowledge.ts`의 `KNOWLEDGE_BASE` 배열에 추가:

```ts
{
  id: 'github-pr',
  label: 'Create GitHub PR',
  category: 'task',  // messaging | task | data | schedule
  keywords: ['github', 'pr', 'pull', 'request', 'merge'],
  description: 'Create a pull request on GitHub',
}
```

새 카테고리라면 `VectorMap.tsx`의 `CATEGORY_COLOR` 맵도 함께 수정하세요.

---

## 현재 한계

| 항목 | 현재 상태 | 영향 범위 |
|---|---|---|
| 지식베이스 크기 | 10개 고정, 코드 내 하드코딩 | 워크플로우 커버리지 |
| 태스크 실행 | Slack만 실제 연동, 나머지 Mock | Jira · Email 자동화 불가 |
| 태스크 타입 | 4종류 고정 | 확장 시 다중 파일 수정 필요 |
| 시스템 프롬프트 | 코드 하드코딩 | 배포 없이 수정 불가 |
| D3 파라미터 | 하드코딩 | 노드 수 증가 시 레이아웃 품질 저하 가능 |
