# Resizable Panels — Design Spec

**Date:** 2026-04-12
**Branch:** feat/resizable-panels (새 브랜치)

---

## Problem

현재 레이아웃(`340px | 1fr | 320px`, 하단 `220px` 고정)에서 AI Streaming Analysis 컬럼이 PC 화면에서 지나치게 넓고 다른 패널이 좁아 가독성이 낮다. 사용자가 패널 비율을 직접 조절할 수 없다.

---

## Solution

CSS Grid의 `grid-template-columns` / `grid-template-rows`를 React state로 제어. 패널 사이에 드래그 가능한 핸들 셀을 삽입해 포인터 이벤트로 크기를 실시간 변경.

**결정 사항:**
- 방향: 가로(컬럼) + 세로(행) 둘 다
- 영속성: 없음 (새로고침 시 기본값으로 리셋)
- 외부 라이브러리: 없음

---

## Architecture

### 새 컴포넌트: `src/components/ResizableLayout.tsx`

`"use client"` 컴포넌트. `page.tsx`의 그리드 div를 이 컴포넌트로 교체.

**State:**
```typescript
interface LayoutSizes {
  col1: number;  // Live Tokenizer 컬럼 너비 (px), 기본값 340
  col3: number;  // Vector Space 컬럼 너비 (px), 기본값 320
  row2: number;  // 하단 행 높이 (px), 기본값 220
}
```

**Grid template:**
```
columns: `${col1}px 6px 1fr 6px ${col3}px`
rows:    `1fr 6px ${row2}px`
```

handle 셀(6px)이 기존 `gap-px` 역할을 대체. 배경색 `bg-border-dim` 유지.

### Grid 셀 배치

```
[col1]     [handle-v1] [col2=1fr]  [handle-v2] [col3]
Tokenizer  │           AI Stream   │           VectorMap   ← row1 (1fr)

[handle-h ─────────────────────────────────────────────]  ← row2 (6px)

PromptLog  [Task Execution ── col 2~5, span 4 ─────────]  ← row3 (row2 px)
```

- handle-h: `grid-column: 1 / -1` (전체 5컬럼 span)
- Task Execution: `grid-column: 2 / -1` (col1 = PromptLog, 나머지 4칸 차지)
- row3의 handle-v1, handle-v2 셀은 Task Execution이 덮어써 시각적으로 사라짐

### 드래그 핸들 동작

```typescript
type HandleType = 'col1' | 'col3' | 'row2';

function useDragHandle(
  type: HandleType,
  sizes: LayoutSizes,
  containerRef: RefObject<HTMLDivElement>,
  onUpdate: (sizes: LayoutSizes) => void
)
```

1. `onPointerDown` → `e.currentTarget.setPointerCapture(e.pointerId)`, 시작 좌표 + 현재 크기 기록
2. `onPointerMove` → delta 계산 → clamp → `onUpdate` 호출
3. `onPointerUp` → 종료

**Clamp 기준 (containerRef 기준 상대값):**
| 값 | 최소 | 최대 |
|---|---|---|
| col1 | 160px | 컨테이너 너비 × 0.4 |
| col3 | 160px | 컨테이너 너비 × 0.4 |
| row2 | 120px | 컨테이너 높이 × 0.6 |
| col2(1fr) | 최소 200px 확보 (col1+col3+handles ≤ 컨테이너-200) |

### 핸들 스타일 (Tailwind)

```
평상시: bg-border-dim, cursor-col-resize / cursor-row-resize
hover : bg-[#1a1a1a] + ::after accent bar 활성화 (transition)
active: bg-[#1e1e1e]
```

세로 핸들 내부: 높이 32px → hover 48px accent 바.
가로 핸들 내부: 너비 32px → hover 48px accent 바.

---

## Files

| 파일 | 변경 |
|------|------|
| `src/components/ResizableLayout.tsx` | 신규 생성 |
| `src/app/page.tsx` | 그리드 div → `<ResizableLayout>` 교체, 내부 패널 children으로 전달 |

`Panel.tsx`, 각 패널 컴포넌트 — **변경 없음**.

---

## Data Flow

```
page.tsx
  └─ ResizableLayout (state: col1, col3, row2)
       ├─ Panel: TokenizerPanel
       ├─ DragHandle (vertical, col1↔col2)
       ├─ Panel: StreamingPanel
       ├─ DragHandle (vertical, col2↔col3)
       ├─ Panel: VectorMap
       ├─ DragHandle (horizontal, full-width)
       ├─ Panel: PromptLog
       └─ Panel: TaskExecutor  (grid-column: 2 / -1, span 4)
```

---

## Error Handling

- 컨테이너 크기 측정 실패 시 clamp 생략, 드래그 값 그대로 적용
- `ResizeObserver` 미지원 환경: 핸들은 표시되지만 최대값 제한 없이 동작 (허용 가능)

---

## Verification

1. `npm run dev` 실행
2. 컬럼 핸들 드래그 → AI Streaming 폭 줄고 Tokenizer 폭 늘어나는지 확인
3. 행 핸들 드래그 → 하단 Task Execution 높이 변경 확인
4. 최솟값 경계 테스트 — 160px 이하로 못 줄어드는지 확인
5. 새로고침 → 기본값(340 / 320 / 220) 복원 확인
6. `tsc --noEmit` + `npm run lint` 통과 확인
