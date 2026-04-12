# 프로젝트 이해 가이드

> README는 남들에게 보여주는 문서고, 이건 나를 위한 문서.

---

## 1. 앱이 하는 일

자연어 텍스트를 입력받아서 → LLM이 분석하고 → 실행 가능한 태스크(Slack, Jira 등)를 뽑아냄.  
그 과정에서 토큰화, 유사도 시각화, 스트리밍 응답을 한 화면에서 실시간으로 보여주는 대시보드.

---

## 2. 사용자 흐름

텍스트 입력 → Start Analysis 클릭 → 이후 자동으로 돌아감.

```
텍스트 입력
  └─ 300ms debounce → gpt-tokenizer → 토큰 칩 표시 (분석 전부터 실시간)

Start Analysis 클릭
  └─ stage: idle → tokenizing

stage가 'tokenizing'으로 바뀌는 순간
  └─ StreamingPanel의 useEffect가 감지 → useAnalyze() 호출

useAnalyze() 실행
  ├─ stage: tokenizing → analyzing
  ├─ POST /api/analyze 호출 → Groq가 분석 시작
  ├─ 응답 헤더에서 x-prompt-log 꺼내서 PromptLog 패널에 저장
  ├─ 스트림 읽으면서 청크마다 appendStreamedText() → StreamingPanel에 실시간 출력
  ├─ 스트리밍 완료
  ├─ stage: analyzing → executing
  ├─ POST /api/tasks 호출 → Groq가 분석 텍스트에서 태스크 JSON 추출
  └─ setTasks() → TaskExecutor에 카드 표시

TaskExecutor
  └─ 모든 카드가 success/rejected/failed 되면 stage: executing → done
```

VectorMap은 stage가 'tokenizing' 또는 'analyzing'이 될 때 D3 시뮬레이션을 초기화함.  
나머지 패널들과 독립적으로 돌아감.

---

## 3. 파일 지도

### `src/store/workflowStore.ts` — 앱의 중심축

모든 컴포넌트가 여기서 상태를 가져옴. Zustand 스토어.

```
input          // 입력 텍스트
tokens         // 토큰 배열 (id, text, colorIndex)
stage          // 현재 파이프라인 단계
streamedText   // Groq가 보내준 텍스트 누적값
tasks          // 추출된 태스크 배열
promptLog      // Groq에 보낸 시스템 프롬프트
```

stage 값에 따라 각 컴포넌트가 알아서 반응함. 직접 함수 호출 없이 상태만 바꾸면 됨.

---

### `src/hooks/useAnalyze.ts` — 분석의 실제 로직

Start Analysis 클릭 이후의 모든 비동기 흐름이 여기 있음.  
`/api/analyze` 호출 → 스트리밍 → `/api/tasks` 호출 → 태스크 저장까지 한 함수에서 처리.

---

### `src/app/api/analyze/route.ts` — 스트리밍 엔드포인트

서버에서만 실행됨. Groq한테 분석 요청 보내고 SSE로 스트림 돌려줌.  
응답 헤더에 `x-prompt-log`를 넣어서 클라이언트가 시스템 프롬프트를 볼 수 있게 함.

---

### `src/app/api/tasks/route.ts` — 태스크 추출 엔드포인트

서버에서만 실행됨. 분석 텍스트를 받아서 Groq한테 "태스크 JSON으로 뽑아줘" 요청.  
Groq 응답을 JSON 파싱해서 `WorkflowTask[]` 배열로 반환.

---

### `src/lib/knowledge.ts` — 벡터맵의 데이터

10개 워크플로우 유형(Slack, Jira, Email 등)이 하드코딩되어 있음.  
각 항목은 keywords 배열을 갖고 있고, 입력 텍스트와의 Jaccard 유사도 계산에 사용됨.  
20차원 벡터도 있는데 현재는 실제 계산에 쓰이지 않음 (placeholder).

---

### `src/lib/mockWebhook.ts` — 가짜 실행기

실제 Slack/Jira API 연동 없이, 딜레이 후 성공을 반환하는 함수.  
TaskCard에서 Approve 누르면 여기로 옴.

---

### `src/components/ResizableLayout.tsx` — 패널 크기 조절

5개 패널을 담는 CSS Grid 레이아웃. 패널 사이 핸들을 드래그하면 크기가 바뀜.  
포인터 이벤트를 window에 붙여서 드래그 중 마우스가 빠져나가도 작동함.

---

### `src/components/VectorMap.tsx` — D3 시각화

D3 force simulation으로 입력 노드(흰색)와 워크플로우 노드들을 연결해서 보여줌.  
유사도가 높을수록 노드가 크고, 링크가 굵고, 불투명하게 표시됨.  
pan(드래그), zoom(스크롤), 더블클릭 리셋 지원.

---

## 4. 데이터가 흐르는 방식

```
TokenizerPanel
  setInput() ──→ store.input
  setTokens() ──→ store.tokens
  setStage('tokenizing') ──→ store.stage

StreamingPanel (useEffect로 stage 감지)
  store.stage === 'tokenizing' ──→ useAnalyze() 호출
  appendStreamedText() ──→ store.streamedText 누적
  → 실시간 렌더링

VectorMap (useEffect로 stage 감지)
  store.stage === 'tokenizing' ──→ D3 시뮬레이션 시작
  store.input ──→ computeSimilarities() ──→ 링크 강도 계산

TaskExecutor
  store.tasks ──→ TaskCard 배열 렌더링
  모두 완료 ──→ setStage('done')
```

컴포넌트끼리 직접 통신하지 않음. 항상 store를 거침.

---

## 5. API 두 개의 차이

| | /api/analyze | /api/tasks |
|---|---|---|
| 언제 호출 | 분석 시작할 때 | 스트리밍 끝난 후 |
| 입력 | 사용자 입력 텍스트 | 분석 결과 텍스트 |
| 출력 | SSE 스트림 (텍스트) | JSON 배열 (태스크) |
| Groq 역할 | 자유로운 분석 작성 | 구조화된 JSON 추출 |

두 번 Groq를 호출하는 이유: 스트리밍 응답 중에는 JSON을 뽑기 어려워서, 분석이 끝난 뒤 별도로 태스크만 추출하는 요청을 보냄.

---

## 6. 기술 선택 이유

### gpt-tokenizer

Groq나 OpenAI API를 쓰지 않고도 브라우저에서 직접 토큰화할 수 있는 라이브러리.  
타이핑할 때마다 API 호출하면 비용·속도 문제가 생기니까, 클라이언트 사이드에서 해결.

### useChat 대신 fetch 직접 사용

Vercel AI SDK의 `useChat`이 편리한데 응답 헤더를 읽는 API가 없음.  
`x-prompt-log` 헤더로 시스템 프롬프트를 전달해 PromptLog 패널에 표시해야 해서, 직접 fetch + ReadableStream으로 구현.

### D3.js

노드가 서로 밀고 당기는 물리 시뮬레이션(force simulation)이 필요했음.  
Recharts, Chart.js 같은 라이브러리는 그래프/차트용이고 이런 자유도를 제공하지 않음.

### D3인데 왜 Jaccard 유사도인가

각 노드의 20차원 벡터는 있지만 실제 의미 공간의 벡터가 아님.  
OpenAI Embeddings 같은 API로 실제 벡터를 뽑아야 의미있는 코사인 유사도가 나옴.  
그래서 API 없이 브라우저에서 즉시 계산 가능한 키워드 겹침(Jaccard)을 대신 사용.

### Zustand

Redux에 비해 설정이 거의 없음. `create()` 한 번으로 스토어 만들고 바로 씀.  
비동기 파이프라인(6단계 stage 전환 + 스트리밍 누적)을 다루는 데 충분함.

---

## 7. 헷갈리기 쉬운 부분

### Groq vs Vercel AI SDK

- **Groq**: 실제 LLM이 돌아가는 서비스. API 키가 필요하고 여기로 요청이 감.
- **Vercel AI SDK**: Groq를 쉽게 쓰기 위한 도구. `streamText(groqProvider(...))` 이런 식으로 씀. 없어도 되지만 스트리밍 설정 코드가 많아짐.

### stage는 누가 바꾸나

```
idle → tokenizing      : TokenizerPanel (버튼 클릭)
tokenizing → analyzing : useAnalyze (분석 시작)
analyzing → executing  : useAnalyze (스트리밍 완료)
executing → done       : TaskExecutor (모든 태스크 완료)
* → error              : useAnalyze (API 실패)
```

### TaskExecutor가 done으로 바꾸는 시점

태스크가 하나라도 있을 때, 전부 `success / rejected / failed` 중 하나가 되면 done.  
태스크가 0개면 useAnalyze에서 바로 done으로 전환.
