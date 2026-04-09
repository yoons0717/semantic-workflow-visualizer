"use client";

import { useEffect, useRef } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useAnalyze } from "@/hooks/useAnalyze";

export function StreamingPanel() {
  const stage = useWorkflowStore((s) => s.stage);
  const streamedText = useWorkflowStore((s) => s.streamedText);
  const { analyze } = useAnalyze();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Trigger analysis when stage changes to 'tokenizing'.
  // Read input via getState() to exclude from dependency array.
  useEffect(() => {
    if (stage !== "tokenizing") return;

    const { input, setStage } = useWorkflowStore.getState();

    if (!input.trim()) {
      setStage("idle");
      return;
    }

    analyze(input);
  }, [stage, analyze]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamedText]);

  const isStreaming = stage === "analyzing";

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto text-[13px] leading-[1.7] text-text-pri"
    >
      {!streamedText && !isStreaming && (
        <div className="h-full flex items-center justify-center font-mono text-[11px] tracking-[0.06em] text-text-dim">
          — Waiting for analysis —
        </div>
      )}
      {streamedText && (
        <span>
          {streamedText}
          {isStreaming && (
            <span className="inline-block w-[7px] h-[14px] bg-accent opacity-90 align-middle ml-[2px] animate-[cursor-blink_0.7s_step-end_infinite]" />
          )}
        </span>
      )}
    </div>
  );
}
