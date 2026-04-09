"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";

export function StreamingPanel() {
  const input = useWorkflowStore((s) => s.input);
  const stage = useWorkflowStore((s) => s.stage);
  const streamedText = useWorkflowStore((s) => s.streamedText);
  const setStage = useWorkflowStore((s) => s.setStage);
  const appendStreamedText = useWorkflowStore((s) => s.appendStreamedText);
  const setPromptLog = useWorkflowStore((s) => s.setPromptLog);

  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // stage가 'tokenizing'으로 바뀌면 분석 요청 실행
  useEffect(() => {
    if (stage !== "tokenizing" || !input.trim()) return;

    const analyze = async () => {
      setIsStreaming(true);
      setStage("analyzing");

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: input }],
          }),
        });

        const promptLog = res.headers.get("x-prompt-log");
        if (promptLog) setPromptLog(promptLog);

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          appendStreamedText(decoder.decode(value, { stream: true }));
        }

        setStage("done");
      } catch {
        setStage("error");
      } finally {
        setIsStreaming(false);
      }
    };

    analyze();
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // 스트리밍 중 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamedText]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto text-[13px] leading-[1.7] text-text-pri"
    >
      {!streamedText && !isStreaming && (
        <div className="h-full flex items-center justify-center font-mono text-[11px] tracking-[0.06em] text-text-dim">
          — 분석 대기 중 —
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
