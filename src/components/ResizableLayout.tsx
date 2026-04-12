"use client";

import { useEffect, useRef, useState } from "react";
import { Panel } from "@/components/Panel";
import { TokenizerPanel } from "@/components/TokenizerPanel";
import { StreamingPanel } from "@/components/StreamingPanel";
import { VectorMap } from "@/components/VectorMap";
import { PromptLog } from "@/components/PromptLog";
import { TaskExecutor } from "@/components/TaskExecutor";

interface LayoutSizes {
  col1: number;
  col3: number;
  row2: number;
}

const DEFAULTS: LayoutSizes = { col1: 340, col3: 320, row2: 220 };

type HandleId = "col1" | "col3" | "row2";

interface DragState {
  id: HandleId;
  startPos: number;
  startSize: number;
  /** 반대쪽 컬럼 크기 — pointerdown 시점 snapshot (col1↔col3 제약 계산용) */
  otherSize: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function ResizableLayout() {
  const [sizes, setSizes] = useState<LayoutSizes>(DEFAULTS);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  // window 레벨 리스너: setPointerCapture 없이도 포인터가 어디 있든 이벤트 수신
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!dragRef.current || !containerRef.current) return;
      const { id, startPos, startSize, otherSize } = dragRef.current;
      const delta = (id === "row2" ? e.clientY : e.clientX) - startPos;
      const rect = containerRef.current.getBoundingClientRect();

      let newSize: number;
      if (id === "col1") {
        const max = Math.min(rect.width * 0.4, rect.width - otherSize - 12 - 200);
        newSize = clamp(startSize + delta, 160, max);
      } else if (id === "col3") {
        const max = Math.min(rect.width * 0.4, rect.width - otherSize - 12 - 200);
        newSize = clamp(startSize - delta, 160, max);
      } else {
        // 아래로 드래그 → 핸들이 내려감 → 하단 row 축소 (1fr 행이 커짐)
        newSize = clamp(startSize - delta, 120, rect.height * 0.6);
      }

      setSizes((prev) => ({ ...prev, [id]: newSize }));
    }

    function onPointerUp() {
      dragRef.current = null;
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []); // 마운트 시 한 번만 — dragRef/containerRef는 ref이므로 클로저 stale 없음

  function handlePointerDown(id: HandleId, e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault(); // 텍스트 선택 방지
    dragRef.current = {
      id,
      startPos: id === "row2" ? e.clientY : e.clientX,
      startSize: sizes[id],
      otherSize: id === "col1" ? sizes.col3 : id === "col3" ? sizes.col1 : 0,
    };
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col overflow-y-auto gap-px md:grid md:overflow-hidden bg-border-dim"
      style={{
        gridTemplateColumns: `${sizes.col1}px 6px 1fr 6px ${sizes.col3}px`,
        gridTemplateRows: `1fr 6px ${sizes.row2}px`,
      }}
    >
      {/* COL 1, ROW 1 — Live Tokenizer */}
      <Panel title="Live Tokenizer" dotColor="#4faee8" className="min-h-60">
        <TokenizerPanel />
      </Panel>

      {/* VERTICAL HANDLE — col1 | col2 */}
      <div
        className="hidden md:flex items-center justify-center bg-border-dim hover:bg-[#1a1a1a] cursor-col-resize group transition-colors duration-150 select-none"
        onPointerDown={(e) => handlePointerDown("col1", e)}
      >
        <div className="w-0.5 h-8 group-hover:h-12 bg-border group-hover:bg-accent rounded-full transition-all duration-150" />
      </div>

      {/* COL 2, ROW 1 — AI Streaming */}
      <Panel
        title="AI Streaming Analysis"
        dotColor="var(--accent)"
        badge="GROQ / llama-3.3-70b"
        className="min-h-75"
      >
        <StreamingPanel />
      </Panel>

      {/* VERTICAL HANDLE — col2 | col3 */}
      <div
        className="hidden md:flex items-center justify-center bg-border-dim hover:bg-[#1a1a1a] cursor-col-resize group transition-colors duration-150 select-none"
        onPointerDown={(e) => handlePointerDown("col3", e)}
      >
        <div className="w-0.5 h-8 group-hover:h-12 bg-border group-hover:bg-accent rounded-full transition-all duration-150" />
      </div>

      {/* COL 3, ROW 1 — Vector Space */}
      <Panel
        title="Vector Space"
        dotColor="var(--purple)"
        badge="Cosine Similarity"
        className="min-h-60"
      >
        <VectorMap />
      </Panel>

      {/* HORIZONTAL HANDLE — row1 | row2 */}
      <div
        className="hidden md:flex items-center justify-center bg-border-dim hover:bg-[#1a1a1a] cursor-row-resize group transition-colors duration-150 select-none"
        style={{ gridColumn: "1 / -1" }}
        onPointerDown={(e) => handlePointerDown("row2", e)}
      >
        <div className="h-0.5 w-8 group-hover:w-12 bg-border group-hover:bg-accent rounded-full transition-all duration-150" />
      </div>

      {/* COL 1, ROW 2 — Prompt Log */}
      <Panel
        title="Prompt Log"
        dotColor="var(--blue)"
        badge="Transparency Panel"
        className="min-h-45"
      >
        <PromptLog />
      </Panel>

      {/* COL 2-3, ROW 2 — Task Execution */}
      <Panel
        title="Task Execution"
        dotColor="var(--amber)"
        badge="Mock Webhook"
        className="min-h-45 md:col-[2/-1]"
      >
        <TaskExecutor />
      </Panel>
    </div>
  );
}
