# Semantic Workflow Visualizer

LLM이 텍스트를 처리하는 과정을 시각화하고, 자연어에서 자동화 태스크를 추출해 실행하는 엔지니어링 대시보드.

**Live Demo →** https://semantic-workflow-visualizer.vercel.app

---

## 어떤 앱인가요?

텍스트를 입력하면 세 가지가 동시에 돌아감:

1. **토크나이저** — GPT와 같은 방식(cl100k_base)으로 텍스트를 쪼개고 각 토큰 ID를 색상 칩으로 표시
2. **벡터 맵** — 입력 키워드와 10개 워크플로우 유형 간 유사도를 D3 force simulation으로 렌더링
3. **AI 분석 → 태스크 추출** — Groq(llama-3.3-70b)이 텍스트를 분석하고 실행 가능한 태스크(Slack, Jira, Email 등)를 JSON으로 추출

추출된 태스크는 카드로 표시되고, 페이로드 수정 후 승인/거부 가능.

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| 실시간 토크나이저 | 타이핑과 동시에 토큰 ID·색상 칩 렌더링 (API 없음) |
| D3 벡터 공간 시각화 | 유사도 기반 force simulation — 노드 크기·링크 굵기가 유사도에 비례 |
| LLM 스트리밍 | Groq SSE 스트림을 청크 단위로 읽어 커서 애니메이션과 함께 실시간 출력 |
| 프롬프트 투명성 | 실제 전송된 시스템 프롬프트를 사이드 패널에서 확인 가능 |
| 태스크 추출 | LLM 응답에서 Slack / Jira / Email / Generic 태스크를 구조화 JSON으로 추출 |
| 인라인 페이로드 편집 | 승인 전 채널명·메시지·프로젝트명 등 파라미터를 카드에서 직접 수정 가능 |
| 리사이즈 레이아웃 | 5개 패널을 드래그 핸들로 자유롭게 크기 조절 가능 |

---

## 시작하기

- Node.js 18+
- [Groq API 키](https://console.groq.com) (무료 가입)

```bash
git clone https://github.com/yoons0717/semantic-workflow-visualizer.git
cd semantic-workflow-visualizer
npm install
```

`.env.local` 파일을 프로젝트 루트에 생성:

```
GROQ_API_KEY=gsk_...
```

```bash
npm run dev
```

http://localhost:3000

### 사용 방법

1. 왼쪽 **Tokenizer** 패널에 텍스트 입력
   - 예: `"Send a deployment complete notification to the team on Slack and create a done ticket in Jira"`
2. 토큰 칩과 통계(토큰 수, 문자 수, 비율)가 실시간 업데이트됨
3. **Start Analysis** 클릭
4. **Vector Map**에서 입력 키워드와 워크플로우 유형 간 유사도가 그려짐
5. **Streaming** 패널에서 Groq 분석이 실시간으로 출력됨
6. 분석 완료 후 하단에 태스크 카드가 나타남
7. 파라미터 수정 후 **Approve** 또는 **Reject**

---

## 아키텍처

```
사용자 입력
    │
    ▼
TokenizerPanel ──────── gpt-tokenizer (브라우저, API 없음)
    │
    │ "Start Analysis" 클릭
    ▼
useAnalyze (hook)
    ├── POST /api/analyze ──── Groq llama-3.3-70b (SSE 스트리밍)
    │       └── StreamingPanel (실시간 렌더링)
    │
    └── POST /api/tasks ────── Groq (structured JSON 추출)
            └── TaskExecutor → TaskCard (승인/거부/실행)

VectorMap ──────────── D3 force simulation (Jaccard 유사도, 클라이언트 연산)

상태 관리: Zustand store (input → tokens → stage → streamedText → tasks)
```

### 파이프라인 단계

```
idle → tokenizing → analyzing → executing → done
                                           ↘ error
```

### 디렉터리 구조

```
src/
├── app/
│   ├── page.tsx                 # 대시보드 레이아웃
│   └── api/
│       ├── analyze/route.ts     # Groq SSE 스트리밍 엔드포인트
│       └── tasks/route.ts       # 태스크 추출 엔드포인트
├── components/
│   ├── TokenizerPanel.tsx       # 실시간 토크나이저
│   ├── VectorMap.tsx            # D3 force simulation
│   ├── StreamingPanel.tsx       # LLM 스트리밍 출력
│   ├── TaskExecutor.tsx         # 태스크 승인 오케스트레이터
│   ├── TaskCard.tsx             # 개별 태스크 카드 (인라인 편집)
│   ├── PipelineStatus.tsx       # 파이프라인 진행 바
│   ├── ResizableLayout.tsx      # 드래그 리사이즈 그리드
│   └── PromptLog.tsx            # 시스템 프롬프트 투명성 패널
├── store/
│   └── workflowStore.ts         # Zustand 전역 상태
├── hooks/
│   └── useAnalyze.ts            # 스트리밍 + 태스크 추출 훅
├── lib/
│   ├── groq.ts                  # Groq 클라이언트
│   ├── tokenizer.ts             # gpt-tokenizer 래퍼
│   ├── knowledge.ts             # 지식베이스 + 유사도 계산
│   └── mockWebhook.ts           # 태스크 실행 시뮬레이터
└── types/
    └── index.ts                 # TypeScript 타입 정의
```

---

## 기술 스택

| 레이어 | 기술 | 선택 이유 |
|---|---|---|
| Framework | Next.js 16 (App Router) | 서버·클라이언트 컴포넌트 분리로 스트리밍 API 최적화 |
| LLM 추론 | Groq (llama-3.3-70b) | OpenAI 대비 응답 속도가 빠르고 무료 티어 존재. 분석과 태스크 추출 두 엔드포인트 모두 Groq로 처리 |
| 스트리밍 추상화 | Vercel AI SDK | Groq SSE 스트리밍을 `streamText()` 한 줄로 처리. 직접 스트림 핸들링 대비 서버 사이드 보일러플레이트를 줄이기 위해 사용 |
| 시각화 | D3.js v7 | force simulation 파라미터를 직접 제어하려면 D3가 필요. 차트 라이브러리로는 불가능한 물리 시뮬레이션 |
| 토크나이저 | gpt-tokenizer (cl100k_base) | 브라우저에서 직접 실행되는 순수 JS 라이브러리. API 호출 없이 GPT와 동일한 토큰화 결과를 얻을 수 있음 |
| 상태 관리 | Zustand | 비동기 파이프라인 상태(6단계 stage + 스트리밍 누적)를 Redux 없이 단순하게 관리 |
| 스타일링 | Tailwind CSS v4 + CSS 변수 디자인 토큰 | 다크 테마 대시보드 일관성 |
| 스키마 검증 | Zod 4 | API 응답 구조 검증. LLM 응답이 예상 스키마와 다를 경우 빈 배열로 안전하게 fallback |
| 언어 | TypeScript 5 | 전체 타입 안전성 |

---

## 구현 상세

### LLM 스트리밍

Vercel AI SDK의 `useChat` 대신 fetch + ReadableStream을 직접 사용. `useChat`은 응답 헤더에 접근하는 API가 없어서, 시스템 프롬프트를 `x-prompt-log` 헤더로 전달해 패널에 표시하려면 수동 스트리밍이 필요했음.

흐름:
1. `POST /api/analyze` → Groq SSE 스트림 수신
2. `TextDecoder`로 청크 디코딩 → Zustand store에 누적
3. 스트림 종료 후 누적 텍스트를 `POST /api/tasks`로 전송해 태스크 추출
4. Groq `json_object` mode로 JSON 수신 → Zod 스키마 검증 → `WorkflowTask[]` 반환

---

### D3 벡터 공간 시각화

실제 임베딩이 아니라 키워드 기반 Jaccard 유사도로 계산됨.

```
similarity = |입력 키워드 ∩ 노드 키워드| / |입력 키워드 ∪ 노드 키워드|
```

임베딩 API 없이 브라우저에서 바로 돌아서 비용이 0. 대신 단어가 정확히 일치해야 유사도가 올라가서 "notify" vs "alert"처럼 의미는 같아도 단어가 다르면 못 잡음.

각 노드는 `knowledge.ts`에 하드코딩된 20차원 벡터를 가짐. 실제 의미 공간을 반영하진 않고, 나중에 실제 임베딩 API로 교체할 때를 위한 placeholder. 현재는 D3 force의 링크 강도·노드 크기·투명도를 Jaccard 유사도로 결정.

D3 force 구성:
- `forceManyBody` — 노드 간 반발 (strength: -80)
- `forceCenter` — 뷰포트 중앙으로 수렴
- `forceLink` — 유사도 비례 인력 (0.05 미만 링크 제거)
- `forceCollide` — 노드 반지름 기반 충돌 방지

노드 색상: messaging(teal), task(orange), data(blue), schedule(purple), 입력 노드(white)

---

### 태스크 실행 (Mock)

실제 Slack·Jira·Email API는 호출하지 않음. 승인하면 `mockWebhook.ts`의 `executeTask()`가 딜레이 후 성공을 반환하는 구조.

| 타입 | 딜레이 | 반환 예시 |
|---|---|---|
| Slack | 600ms | `Message sent to #channel` |
| Jira | 1200ms | `Ticket created: PROJ-342` |
| Email | 800ms | `Email delivered to user@example.com` |
| Generic | 500ms | `Task executed successfully` |

---

## 환경 변수

| 변수 | 필수 | 설명 |
|---|---|---|
| `GROQ_API_KEY` | ✅ | [Groq Console](https://console.groq.com)에서 발급 |

---

## 테스트 입력 예시

아래 문장들을 **Tokenizer 패널**에 붙여넣고 Start Analysis를 눌러보세요.

**Slack + Jira 동시 추출**
```
Send a deployment complete notification to the team on Slack and create a done ticket in Jira
```

**Email + 일정**
```
Email the client a project summary and schedule a follow-up meeting for next Monday
```

**데이터 + 리포트**
```
Query the sales database for last month's records and generate a summary report
```

**코드 리뷰 요청**
```
Request a code review for the new authentication PR and notify the backend team on Slack
```

**멀티 태스크 (4종)**
```
Send a Slack alert to #ops, open a Jira bug ticket for the payment failure, email the finance team, and upload the error log to storage
```

**한국어 입력 (토크나이저 비교용)**
```
배포 완료 알림을 슬랙 #dev 채널에 보내고 지라에 완료 티켓을 생성해줘
```

---

## 한계

| 항목 | 현재 | 비고 |
|---|---|---|
| 유사도 계산 | Jaccard (단어 정확 일치) | "notify" ≠ "notification" — 의미가 같아도 단어가 다르면 유사도 0 |
| 지식베이스 벡터 | 임의 20차원 값 | 실제 임베딩 아님, 의미 공간 미반영 |
| 지식베이스 크기 | 10개 고정 | 추가하려면 `knowledge.ts` 직접 수정 필요 |
| 태스크 실행 | 전부 Mock | 실제 Slack · Jira · Email API 미연동, 항상 성공 반환 |
| 태스크 타입 | 4종 (slack · jira · email · generic) | 그 외는 전부 generic으로 분류됨 |
| 태스크 추출 | Groq `json_object` mode + Zod 스키마 검증 | LLM이 항상 valid JSON 반환, 스키마 불일치 시 `[]` fallback |

---

## 라이선스

MIT
