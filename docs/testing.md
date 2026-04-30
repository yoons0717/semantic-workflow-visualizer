# Testing

## 실행

```bash
npm test             # 전체 테스트 실행
npm run test:watch   # watch 모드
```

---

## 테스트 구성

| 파일 | 대상 | 주요 케이스 |
|---|---|---|
| `components/__tests__/StreamingPanel.test.tsx` | `renderLine` | 섹션 헤더, 번호 리스트, 불릿, 빈 줄 |
| `store/__tests__/workflowStore.test.ts` | Zustand 액션 | 청크 누적, 전체 리셋, 에러 메시지 토글 |
| `components/__tests__/PipelineStatus.test.tsx` | `PipelineStatus` | stage별 레이블 전환, 스텝 렌더링 |

---

## 환경 설정

- **`jest.setup.ts`**: `@testing-library/jest-dom` + `TextEncoder`/`TextDecoder` 폴리필
  - jsdom 환경에서 이 두 API가 기본 제공되지 않아 Node.js `util`에서 주입
- **fetch mock**: `Object.defineProperty(globalThis, 'fetch', ...)` 사용
  - Node 24 내장 fetch는 단순 할당으로 오버라이드가 안 되기 때문
