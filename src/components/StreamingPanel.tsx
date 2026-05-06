"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";

export function CopyButton() {
  const streamedText = useWorkflowStore((s) => s.streamedText);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!streamedText) return;
    navigator.clipboard.writeText(streamedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      onClick={handleCopy}
      disabled={!streamedText}
      title="Copy analysis"
      className="font-mono text-[10px] text-text-dim transition-colors duration-150 disabled:opacity-20 disabled:cursor-not-allowed hover:text-text-pri"
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        /^\*\*[^*]+\*\*$/.test(part)
          ? <strong key={i} className="font-semibold text-text-pri">{part.slice(2, -2)}</strong>
          : part
      )}
    </>
  );
}

export function renderLine(line: string, i: number) {
  const trimmed = line.trim();

  // ## / ### 헤딩
  const headingMatch = trimmed.match(/^#{1,3}\s+(.+)/);
  if (headingMatch) {
    return (
      <p key={i} className="font-mono text-[11px] font-semibold text-accent mt-4 mb-1 first:mt-0">
        {headingMatch[1]}
      </p>
    );
  }

  // **전체 줄** → 섹션 헤더
  if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
    return (
      <p key={i} className="font-mono text-[11px] font-semibold text-accent mt-4 mb-1 first:mt-0">
        {trimmed.replace(/\*\*/g, "")}
      </p>
    );
  }

  // **Label**: description (bold 레이블 + 설명)
  const boldLabelMatch = trimmed.match(/^\*\*(.+?)\*\*:?\s+(.*)/);
  if (boldLabelMatch) {
    const [, label, rest] = boldLabelMatch;
    return (
      <p key={i} className="text-[12px] leading-[1.6]">
        <span className="font-semibold text-text-pri">{label}</span>
        {rest && <span className="text-text-sec">: {renderInline(rest)}</span>}
      </p>
    );
  }

  // 1. **bold**: rest → 번호 리스트
  const listMatch = trimmed.match(/^(\d+)\.\s+\*\*(.+?)\*\*:?\s*(.*)/);
  if (listMatch) {
    const [, num, bold, rest] = listMatch;
    return (
      <p key={i} className="ml-3 text-[12px] leading-[1.6]">
        <span className="text-text-dim font-mono text-[10px]">{num}.</span>{" "}
        <span className="font-semibold text-text-pri">{bold}</span>
        {rest && <span className="text-text-sec">: {renderInline(rest)}</span>}
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
        {renderInline(content)}
      </p>
    );
  }

  // - 불릿 리스트
  if (trimmed.startsWith("- ")) {
    return (
      <p key={i} className="ml-3 text-[12px] leading-[1.6] text-text-sec">
        <span className="text-text-dim mr-1">·</span>
        {renderInline(trimmed.slice(2))}
      </p>
    );
  }

  // 빈 줄
  if (!trimmed) return <div key={i} className="h-1" />;

  // 일반 텍스트
  return (
    <p key={i} className="text-[12px] leading-[1.6] text-text-sec">
      {renderInline(line)}
    </p>
  );
}

export function StreamingPanel() {
  const stage = useWorkflowStore((s) => s.stage);
  const streamedText = useWorkflowStore((s) => s.streamedText);

  const scrollRef = useRef<HTMLDivElement>(null);

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
