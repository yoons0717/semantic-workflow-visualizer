# Troubleshooting & Known Limitations

## 트러블슈팅

### `x-prompt-log` 헤더가 비어있음

`GROQ_API_KEY`가 없으면 `/api/analyze`가 스트림 시작 전 500을 반환해 헤더가 없습니다. `.env.local` 파일과 키 값을 확인하세요.

---

### VectorMap이 움직이지 않음

`stage`가 `analyzing` 이상일 때만 시뮬레이션이 활성화됩니다. "Start Analysis" 버튼을 클릭해야 합니다.

---

### 태스크가 추출되지 않음

`/api/tasks` 응답을 브라우저 개발자 도구 Network 탭에서 확인하세요. LLM 응답 파싱 실패 시 `[]`를 반환합니다. 시스템 프롬프트(`lib/groq.ts`)의 JSON 형식 지시사항이 명확한지 확인하세요.

---

### Groq rate limit 에러

무료 티어는 분당 30 요청 제한입니다. 분석 요청은 버튼 클릭으로만 발생하므로 연속 클릭을 피하면 됩니다.

---

### `next.config.ts` 관련 빌드 에러

```ts
// 이 설정이 없으면 Groq SDK가 서버 빌드에서 실패합니다
serverExternalPackages: ['groq-sdk']
```

---

## 현재 한계

| 항목 | 현재 상태 | 영향 범위 |
|---|---|---|
| 지식베이스 크기 | 10개 고정, 코드 내 하드코딩 | 워크플로우 커버리지 |
| 태스크 실행 | Slack만 실제 연동, 나머지 Mock | Jira · Email 자동화 불가 |
| 태스크 타입 | 4종류 고정 | 확장 시 다중 파일 수정 필요 |
| 시스템 프롬프트 | 코드 하드코딩 | 배포 없이 수정 불가 |
| D3 파라미터 | 하드코딩 | 노드 수 증가 시 레이아웃 품질 저하 가능 |
