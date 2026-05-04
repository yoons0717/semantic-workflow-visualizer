# ReviewMate

GitHub PR을 분석해 코드 이슈를 추출하고, Notion 이슈로 자동 생성하는 개발 생산성 도구.

**Live Demo →** https://reviewmate.vercel.app

---

## 어떻게 동작하나요?

GitHub PR을 선택하면 세 단계가 순서대로 실행됨:

1. **PR 데이터 수집** — GitHub API로 PR 제목·본문·diff를 가져옴
2. **Gemini AI 분석** — diff를 읽고 버그·컨벤션 위반·개선 포인트를 스트리밍으로 분석
3. **태스크 생성** — 분석 결과를 구조화된 태스크로 추출 → Notion 이슈 생성 및 Slack 알림 발송

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| GitHub PR 분석 | 레포와 PR을 드롭다운으로 선택, diff 자동 수집 (최대 12,000자) |
| 레포 즐겨찾기 | ★ 버튼으로 자주 쓰는 레포 저장, 칩으로 빠르게 전환 (localStorage 유지) |
| Gemini AI 스트리밍 | 분석 결과를 SSE 스트림으로 실시간 출력 |
| 프롬프트 투명성 | 실제 전송된 시스템 프롬프트를 사이드 패널에서 확인 가능 |
| 태스크 추출 | 분석 결과에서 Notion / Slack 태스크를 구조화 JSON으로 추출. Critical 버그 발견 시 Notion 이슈 + Slack 알림 동시 생성 |
| Notion 연동 | 워크스페이스 DB 목록 조회 → 태스크 카드에서 DB 선택 후 이슈 생성 |
| 인라인 페이로드 편집 | 승인 전 이슈 제목·설명·우선순위를 카드에서 직접 수정 가능 |
| 에러 UX | 분석 실패 시 ErrorBanner + Try Again 버튼으로 바로 재시도 가능 |
| 리사이즈 레이아웃 | 5개 패널을 드래그 핸들로 자유롭게 크기 조절 가능 |

---

## 시작하기

- Node.js 20.9+
- [Google AI Studio API 키](https://aistudio.google.com/apikey)

```bash
git clone https://github.com/yoons0717/ReviewMate.git
cd ReviewMate
npm install
```

`.env.local` 파일을 프로젝트 루트에 생성:

```
GEMINI_API_KEY=AI...        # 필수 — Google AI Studio에서 발급
GEMINI_MODEL=gemini-2.5-flash-lite  # 선택 — 기본값
GITHUB_TOKEN=ghp_...        # 선택 — 없으면 GitHub 공개 레포만 분석 가능 (rate limit 낮음)
NOTION_API_KEY=secret_...   # 선택 — 없으면 Notion 태스크가 Mock으로 실행
SLACK_WEBHOOK_URL=https://hooks.slack.com/...  # 선택 — 없으면 Slack 태스크가 Mock으로 실행
```

```bash
npm run dev
```

http://localhost:3000

### 사용 방법

1. 왼쪽 **GitHub PR** 패널에서 레포와 PR을 드롭다운으로 선택
   - 자주 쓰는 레포는 ★ 버튼으로 즐겨찾기 등록 가능
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
                    └── POST /api/webhook/slack (Slack 알림)

상태 관리: Zustand store (githubRepo/PR → stage → streamedText → tasks)
파이프라인: idle → analyzing → executing → done / error
```

---

## 기술 스택

| 레이어 | 기술 |
|---|---|
| Framework | Next.js 16 (App Router) |
| LLM | Gemini 2.5 Flash Lite via Vercel AI SDK |
| Notion | @notionhq/client — DB 스키마 동적 조회 |
| 상태 관리 | Zustand |
| 스키마 검증 | Zod |
| 스타일링 | Tailwind CSS v4 + CSS 변수 디자인 토큰 |
| 언어 | TypeScript 5 |

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

| 항목 | 현재 |
|---|---|
| diff 크기 | 최대 12,000자 (대규모 PR은 잘림) |
| 태스크 타입 | notion · slack만 지원 |
| Notion 연동 | 이슈 생성만 지원 (기존 이슈 업데이트 불가) |
| GitHub 접근 | Private 레포는 GITHUB_TOKEN 필요 |

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
