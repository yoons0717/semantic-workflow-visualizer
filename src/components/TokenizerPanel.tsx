"use client";

import { useEffect, useRef } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { tokenizeText } from "@/lib/tokenizer";

const TOKEN_COLORS = [
  { bg: "var(--tok-1)", text: "var(--tok-t1)" },
  { bg: "var(--tok-2)", text: "var(--tok-t2)" },
  { bg: "var(--tok-3)", text: "var(--tok-t3)" },
  { bg: "var(--tok-4)", text: "var(--tok-t4)" },
  { bg: "var(--tok-5)", text: "var(--tok-t5)" },
];

export function TokenizerPanel() {
  const input = useWorkflowStore((s) => s.input);
  const tokens = useWorkflowStore((s) => s.tokens);
  const setInput = useWorkflowStore((s) => s.setInput);
  const setTokens = useWorkflowStore((s) => s.setTokens);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setTokens(tokenizeText(input));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, setTokens]);

  const charCount = input.length;
  const tokenCount = tokens.length;
  const ratio = charCount > 0 ? (tokenCount / charCount).toFixed(2) : "0.00";

  return (
    <div className="flex flex-col gap-[10px] h-full overflow-hidden">
      {/* Input area */}
      <div
        className="rounded-[3px] p-[10px_12px] flex flex-col gap-[6px] shrink-0 bg-bg-input"
        style={{ border: "1px solid var(--border)" }}
      >
        <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-dim">
          입력 텍스트
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="텍스트를 입력하세요..."
          rows={3}
          className="resize-none bg-transparent outline-none text-[13px] leading-[1.5] text-text-pri placeholder:opacity-30"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-[16px] shrink-0">
        <StatItem label="Tokens" value={tokenCount} />
        <StatItem label="Chars" value={charCount} />
        <StatItem label="Ratio" value={ratio} />
      </div>

      {/* Token grid */}
      <div className="flex flex-wrap gap-[4px] overflow-y-auto flex-1 content-start">
        {tokens.map((token, i) => {
          const color = TOKEN_COLORS[token.colorIndex];
          // 공백 전용 토큰은 "·"로 표시, 그 외는 원문 유지
          const display = token.text.trim() === "" ? "·" : token.text;
          return (
            <div
              key={`${i}-${token.id}`}
              className="flex flex-col items-center gap-[1px] min-w-[28px] px-[6px] py-[3px] rounded-[2px]"
              style={{ background: color.bg }}
            >
              <span
                className="font-mono text-[11px] font-medium leading-none"
                style={{ color: color.text }}
              >
                {display}
              </span>
              <span
                className="font-mono text-[8px] leading-none opacity-60"
                style={{ color: color.text }}
              >
                {token.id}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <div className="font-mono text-[18px] font-bold leading-none text-accent">
        {value}
      </div>
      <div className="text-[9px] tracking-[0.1em] uppercase text-text-dim">
        {label}
      </div>
    </div>
  );
}
