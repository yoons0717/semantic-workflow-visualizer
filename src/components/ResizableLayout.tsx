"use client";

import { useRef, useState } from "react";
import { Panel } from "@/components/Panel";
import { TokenizerPanel } from "@/components/TokenizerPanel";
import { StreamingPanel } from "@/components/StreamingPanel";
import { VectorMap } from "@/components/VectorMap";
import { PromptLog } from "@/components/PromptLog";

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
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function ResizableLayout() {
  const [sizes, setSizes] = useState<LayoutSizes>(DEFAULTS);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  function handlePointerDown(id: HandleId, e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      id,
      startPos: id === "row2" ? e.clientY : e.clientX,
      startSize: sizes[id],
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !containerRef.current) return;
    const { id, startPos, startSize } = dragRef.current;
    const delta = (id === "row2" ? e.clientY : e.clientX) - startPos;
    const rect = containerRef.current.getBoundingClientRect();

    let newSize: number;
    if (id === "col1") {
      const max = Math.min(rect.width * 0.4, rect.width - sizes.col3 - 12 - 200);
      newSize = clamp(startSize + delta, 160, max);
    } else if (id === "col3") {
      const max = Math.min(rect.width * 0.4, rect.width - sizes.col1 - 12 - 200);
      newSize = clamp(startSize - delta, 160, max);
    } else {
      newSize = clamp(startSize + delta, 120, rect.height * 0.6);
    }

    setSizes((prev) => ({ ...prev, [id]: newSize }));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col overflow-y-auto gap-px md:grid md:overflow-hidden bg-border-dim"
      style={{
        gridTemplateColumns: `${sizes.col1}px 6px 1fr 6px ${sizes.col3}px`,
        gridTemplateRows: `1fr 6px ${sizes.row2}px`,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* COL 1, ROW 1 — Live Tokenizer */}
      <Panel title="Live Tokenizer" dotColor="#4faee8" className="min-h-[240px]">
        <TokenizerPanel />
      </Panel>

      {/* VERTICAL HANDLE — col1 | col2 */}
      <div
        className="hidden md:flex items-center justify-center bg-border-dim hover:bg-[#1a1a1a] cursor-col-resize group transition-colors duration-150 select-none"
        onPointerDown={(e) => handlePointerDown("col1", e)}
      >
        <div className="w-[2px] h-8 group-hover:h-12 bg-border group-hover:bg-accent rounded-full transition-all duration-150" />
      </div>

      {/* COL 2, ROW 1 — AI Streaming */}
      <Panel
        title="AI Streaming Analysis"
        dotColor="var(--accent)"
        badge="GROQ / llama-3.3-70b"
        className="min-h-[300px]"
      >
        <StreamingPanel />
      </Panel>

      {/* VERTICAL HANDLE — col2 | col3 */}
      <div
        className="hidden md:flex items-center justify-center bg-border-dim hover:bg-[#1a1a1a] cursor-col-resize group transition-colors duration-150 select-none"
        onPointerDown={(e) => handlePointerDown("col3", e)}
      >
        <div className="w-[2px] h-8 group-hover:h-12 bg-border group-hover:bg-accent rounded-full transition-all duration-150" />
      </div>

      {/* COL 3, ROW 1 — Vector Space */}
      <Panel
        title="Vector Space"
        dotColor="var(--purple)"
        badge="Cosine Similarity"
        className="min-h-[240px]"
      >
        <VectorMap />
      </Panel>

      {/* HORIZONTAL HANDLE — row1 | row2 */}
      <div
        className="hidden md:flex items-center justify-center bg-border-dim hover:bg-[#1a1a1a] cursor-row-resize group transition-colors duration-150 select-none"
        style={{ gridColumn: "1 / -1" }}
        onPointerDown={(e) => handlePointerDown("row2", e)}
      >
        <div className="h-[2px] w-8 group-hover:w-12 bg-border group-hover:bg-accent rounded-full transition-all duration-150" />
      </div>

      {/* COL 1, ROW 2 — Prompt Log */}
      <Panel
        title="Prompt Log"
        dotColor="var(--blue)"
        badge="Transparency Panel"
        className="min-h-[180px]"
      >
        <PromptLog />
      </Panel>

      {/* COL 2-3, ROW 2 — Task Execution */}
      <Panel
        title="Task Execution"
        dotColor="var(--amber)"
        badge="Mock Webhook"
        className="min-h-[180px] md:[grid-column:2/-1]"
      >
        <div className="h-full flex items-center justify-center font-mono text-[11px] tracking-[0.06em] text-text-dim">
          — No tasks —
        </div>
      </Panel>
    </div>
  );
}
