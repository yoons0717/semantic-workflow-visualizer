"use client";

import { useEffect, useRef } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useAnalyze } from "@/hooks/useAnalyze";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";

export function renderLine(line: string, i: number) {
  const trimmed = line.trim();

  // **텍스트** 또는 **텍스트:** → 섹션 헤더
  if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
    return (
      <p key={i} className="font-mono text-[11px] font-semibold text-accent mt-4 mb-1 first:mt-0">
        {trimmed.replace(/\*\*/g, "")}
      </p>
    );
  }

  // 1. 2. 3. → 번호 리스트
  const listMatch = trimmed.match(/^(\d+)\.\s+\*\*(.+?)\*\*:?\s*(.*)/);
  if (listMatch) {
    const [, num, bold, rest] = listMatch;
    return (
      <p key={i} className="ml-3 text-[12px] leading-[1.6]">
        <span className="text-text-dim font-mono text-[10px]">{num}.</span>{" "}
        <span className="font-semibold text-text-pri">{bold}</span>
        {rest && <span className="text-text-sec">: {rest}</span>}
      </p>
    );
  }

  // 번호 리스트 (bold 없는 경우)
  const simpleListMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
  if (simpleListMatch) {
    const [, num, content] = simpleListMatch;
    return (
      <p key={i} className="ml-3 text-[12px] leading-[1.6] text-text-sec">
        <span className="text-text-dim font-mono text-[10px]">{num}.</span>{" "}
        {content}
      </p>
    );
  }

  // - 불릿 리스트
  if (trimmed.startsWith("- ")) {
    return (
      <p key={i} className="ml-3 text-[12px] leading-[1.6] text-text-sec">
        <span className="text-text-dim mr-1">·</span>
        {trimmed.slice(2)}
      </p>
    );
  }

  // 빈 줄
  if (!trimmed) return <div key={i} className="h-1" />;

  // 일반 텍스트
  return (
    <p key={i} className="text-[12px] leading-[1.6] text-text-sec">
      {line}
    </p>
  );
}

export function StreamingPanel() {
  const stage = useWorkflowStore((s) => s.stage);
  const streamedText = useWorkflowStore((s) => s.streamedText);
  const { analyze } = useAnalyze();

  const scrollRef = useRef<HTMLDivElement>(null);

  // stage가 'tokenizing'으로 바뀌면 분석 요청 실행.
  // input은 getState()로 읽어 의존성 배열에서 제외.
  useEffect(() => {
    if (stage !== "tokenizing") return;

    const { input, setStage } = useWorkflowStore.getState();

    if (!input.trim()) {
      setStage("idle");
      return;
    }

    analyze(input);
  }, [stage, analyze]);

  // 스트리밍 중 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamedText]);

  const isStreaming = stage === "analyzing";

  if (stage === "error") {
    return <ErrorBanner />;
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      {!streamedText && !isStreaming && (
        <EmptyState>— Waiting for analysis —</EmptyState>
      )}
      {streamedText && (
        <div className="flex flex-col gap-0.5">
          {streamedText.split("\n").map((line, i) => renderLine(line, i))}
          {isStreaming && (
            <span className="inline-block w-1.75 h-3.5 bg-accent opacity-90 align-middle ml-0.5 animate-[cursor-blink_0.7s_step-end_infinite]" />
          )}
        </div>
      )}
    </div>
  );
}
