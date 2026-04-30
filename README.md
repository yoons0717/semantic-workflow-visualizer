# Semantic Workflow Visualizer

GitHub PR을 분석해 코드 이슈를 추출하고, Notion 이슈로 자동 생성하는 개발 생산성 도구.

**Live Demo →** https://semantic-workflow-visualizer.vercel.app

---

## 어떤 앱인가요?

GitHub PR 번호를 입력하면 세 단계가 순서대로 실행됨:

1. **PR 데이터 수집** — GitHub API로 PR 제목·본문·diff를 가져옴
2. **Gemini AI 분석** — diff를 읽고 버그·컨벤션 위반·개선 포인트를 스트리밍으로 분석
3. **Notion 이슈 생성** — 분석 결과를 구조화된 태스크로 추출 → 선택한 Notion DB에 이슈 카드 생성

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| GitHub PR 분석 | repo와 PR 번호만 입력하면 diff 자동 수집 (최대 12,000자) |
| Gemini AI 스트리밍 | 분석 결과를 SSE 스트림으로 실시간 출력, 커서 애니메이션 포함 |
| 프롬프트 투명성 | 실제 전송된 시스템 프롬프트를 사이드 패널에서 확인 가능 |
| 태스크 추출 | 분석 결과에서 Notion / Slack / Generic 태스크를 구조화 JSON으로 추출 |
| Notion 연동 | 워크스페이스 DB 목록 조회 → 태스크 카드에서 DB 선택 후 이슈 생성 |
| 인라인 페이로드 편집 | 승인 전 이슈 제목·설명·우선순위를 카드에서 직접 수정 가능 |
| 에러 UX | 분석 실패 시 ErrorBanner + Try Again 버튼으로 바로 재시도 가능 |
| 리사이즈 레이아웃 | 5개 패널을 드래그 핸들로 자유롭게 크기 조절 가능 |

---

## 시작하기

- Node.js 18+
- [Google AI Studio API 키](https://aistudio.google.com/apikey)

```bash
git clone https://github.com/yoons0717/semantic-workflow-visualizer.git
cd semantic-workflow-visualizer
npm install
```

`.env.local` 파일을 프로젝트 루트에 생성:

```
GEMINI_API_KEY=AI...        # 필수 — Google AI Studio에서 발급
GEMINI_MODEL=gemini-2.5-flash-lite  # 선택 — 기본값
GITHUB_TOKEN=ghp_...        # 선택 — 없으면 GitHub 공개 레포만 분석 가능 (rate limit 낮음)
NOTION_API_KEY=secret_...   # 선택 — 없으면 Notion 태스크가 Mock으로 실행
```

```bash
npm run dev
```

http://localhost:3000

### 사용 방법

1. 왼쪽 **GitHub PR** 패널에 레포(owner/repo)와 PR 번호 입력
   - 예: `yoons0717/semantic-workflow-visualizer` / `40`
2. **▶ Analyze PR** 클릭
3. **AI Streaming Analysis** 패널에서 Gemini 분석이 실시간으로 출력됨
4. 분석 완료 후 하단에 태스크 카드가 나타남
5. Notion DB를 선택하고 파라미터 수정 후 **Approve** 또는 **Reject**

---

## 아키텍처

```
GitHub PR 입력 (owner/repo + PR#)
    │
    ▼
GET /api/github/pr ─── GitHub API (PR 제목·본문·diff)
    │
    ▼
useAnalyze (hook)
    ├── POST /api/analyze ──── Gemini AI (SSE 스트리밍)
    │       └── StreamingPanel (실시간 렌더링)
    │
    └── POST /api/tasks ────── Gemini (structured JSON 추출)
            └── TaskExecutor → TaskCard (승인/거부/실행)
                    ├── POST /api/notion/rows  (Notion 이슈 생성)
                    └── POST /api/webhook/slack (Slack 연동)

상태 관리: Zustand store (githubRepo/PR → stage → streamedText → tasks)
```

### 파이프라인 단계

```
idle → analyzing → executing → done
                              ↘ error
```

## 기술 스택

| 레이어 | 기술 | 선택 이유 |
|---|---|---|
| Framework | Next.js (App Router) | 서버·클라이언트 컴포넌트 분리로 스트리밍 API 최적화 |
| LLM 추론 | Gemini 2.5 Flash Lite | 빠른 응답·무료 티어 존재. 분석과 태스크 추출 두 엔드포인트 모두 처리 |
| 스트리밍 추상화 | Vercel AI SDK | Gemini SSE 스트리밍을 `streamText()` 한 줄로 처리 |
| 태스크 연동 | Notion API (`@notionhq/client`) | DB 스키마를 동적으로 조회해 컬럼명 무관하게 이슈 생성 |
| PR 수집 | GitHub REST API | PR 제목·본문·파일 diff 수집 (최대 12,000자 truncate) |
| 상태 관리 | Zustand | 비동기 파이프라인 상태를 Redux 없이 단순하게 관리 |
| 스키마 검증 | Zod | API 응답 구조 검증. LLM 응답 스키마 불일치 시 `[]`로 안전하게 fallback |
| 스타일링 | Tailwind CSS v4 + CSS 변수 디자인 토큰 | 다크 테마 대시보드 일관성 |
| 언어 | TypeScript 5 | 전체 타입 안전성 |

---

## 환경 변수

| 변수 | 필수 | 설명 |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | [Google AI Studio](https://aistudio.google.com/apikey)에서 발급 |
| `GEMINI_MODEL` | 선택 | 기본값 `gemini-2.5-flash-lite`. 다른 Gemini 모델로 교체 가능 |
| `GITHUB_TOKEN` | 선택 | 없으면 공개 레포만 분석 가능하며 rate limit이 낮음 (60 req/h) |
| `NOTION_API_KEY` | 선택 | [Notion Integration](https://www.notion.com/my-integrations)에서 발급. 없으면 Notion 태스크가 Mock으로 실행 |
| `SLACK_WEBHOOK_URL` | 선택 | Slack Incoming Webhook URL. 없으면 Slack 태스크가 Mock으로 실행 |

---

## 한계

| 항목 | 현재 | 비고 |
|---|---|---|
| diff 크기 | 최대 12,000자 | 대규모 PR은 diff가 잘림 |
| 태스크 타입 | notion · slack | 그 외 타입은 추출되지 않음 |
| 태스크 추출 | Gemini `json_object` mode + Zod 검증 | 스키마 불일치 시 `[]` fallback |
| Notion 연동 | 이슈 생성만 지원 | 기존 이슈 업데이트 불가 |
| GitHub 접근 | Public 레포 무인증, Private 레포는 GITHUB_TOKEN 필요 | - |

---

## 개발 문서

| 문서 | 내용 |
|---|---|
| [docs/codebase.md](docs/codebase.md) | 디렉터리 구조, 핵심 모듈, API Routes, 확장 가이드 |
| [docs/development.md](docs/development.md) | 코드 컨벤션 |
| [docs/testing.md](docs/testing.md) | 테스트 실행 및 구성 |

---

## 라이선스

MIT
