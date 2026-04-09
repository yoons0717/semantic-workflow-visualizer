"use client";

import { useEffect, useRef } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { tokenizeText } from "@/lib/tokenizer";

const ANALYZABLE_STAGES = ["idle", "done", "error"] as const;

const TOKEN_CHIP_CLASSES = [
  "tok-chip-0",
  "tok-chip-1",
  "tok-chip-2",
  "tok-chip-3",
  "tok-chip-4",
];

export function TokenizerPanel() {
  const input = useWorkflowStore((s) => s.input);
  const tokens = useWorkflowStore((s) => s.tokens);
  const stage = useWorkflowStore((s) => s.stage);
  const setInput = useWorkflowStore((s) => s.setInput);
  const setTokens = useWorkflowStore((s) => s.setTokens);
  const setStage = useWorkflowStore((s) => s.setStage);
  const reset = useWorkflowStore((s) => s.reset);

  const canAnalyze = input.trim().length > 0 && (ANALYZABLE_STAGES as readonly string[]).includes(stage);

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
      <div className="rounded-[3px] p-[10px_12px] flex flex-col gap-[6px] shrink-0 bg-bg-input border border-border">
        <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-dim">
          Input Text
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text here..."
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

      {/* Action buttons */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setStage("tokenizing")}
          disabled={!canAnalyze}
          className={`flex-1 font-mono text-[9px] tracking-[0.08em] uppercase px-3 py-[5px] rounded-[2px] border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${
            canAnalyze
              ? "bg-[#0d2a1e] text-accent border-[#1a4a38]"
              : "bg-transparent text-text-dim border-border-dim"
          }`}
        >
          ▶ Start Analysis
        </button>
        <button
          onClick={() => reset()}
          className="font-mono text-[9px] tracking-[0.08em] uppercase px-3 py-[5px] rounded-[2px] border border-border-dim text-text-dim transition-all duration-150 hover:text-swv-red hover:border-swv-red"
        >
          Reset
        </button>
      </div>

      {/* Token grid */}
      <div className="flex flex-wrap gap-[4px] overflow-y-auto flex-1 content-start">
        {tokens.map((token, i) => {
          // 공백 전용 토큰은 "·"로 표시, 그 외는 원문 유지
          const display = token.text.trim() === "" ? "·" : token.text;
          return (
            <div
              key={`${i}-${token.id}`}
              className={`flex flex-col items-center gap-[1px] min-w-[28px] px-[6px] py-[3px] rounded-[2px] ${TOKEN_CHIP_CLASSES[token.colorIndex]}`}
            >
              <span className="font-mono text-[11px] font-medium leading-none">
                {display}
              </span>
              <span className="font-mono text-[8px] leading-none opacity-60">
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
