# Development Guide

코드 작성 시 따라야 할 컨벤션입니다. 전체 규칙은 `CONVENTIONS.md`를 참고하세요.

---

## 코드 컨벤션

| 규칙 | 내용 |
|---|---|
| Export | 컴포넌트는 반드시 named export (`app/` 라우트 파일 제외) |
| 클라이언트 경계 | `src/components/` 모든 파일 첫 줄에 `"use client"` |
| 브라우저 전용 코드 | D3, gpt-tokenizer 등은 반드시 `useEffect` 내부에서 실행 |
| 타입 | `any` 사용 금지, 공유 타입은 `src/types/index.ts`에서 관리 |
| 스타일 | 인라인 `style={{}}` 은 D3 동적 값에만 허용 |
| fetch | 컴포넌트 내 직접 fetch 금지 — 반드시 훅으로 추상화 |
| 스토어 | 스토어에서 직접 API 호출 금지 |
