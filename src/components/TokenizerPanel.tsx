"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useAnalyze } from "@/hooks/useAnalyze";
import { tokenizeText } from "@/lib/tokenizer";
import { Spinner } from "@/components/Spinner";
import type { PipelineStage } from "@/types";

const ANALYZABLE_STAGES: readonly PipelineStage[] = ["idle", "done", "error"];

const TOKEN_CHIP_CLASSES = [
  "tok-chip-0",
  "tok-chip-1",
  "tok-chip-2",
  "tok-chip-3",
  "tok-chip-4",
];

type Mode = "text" | "pr";

export function TokenizerPanel() {
  const [mode, setMode] = useState<Mode>("text");

  const input = useWorkflowStore((s) => s.input);
  const tokens = useWorkflowStore((s) => s.tokens);
  const stage = useWorkflowStore((s) => s.stage);
  const setInput = useWorkflowStore((s) => s.setInput);
  const setTokens = useWorkflowStore((s) => s.setTokens);
  const setStage = useWorkflowStore((s) => s.setStage);
  const reset = useWorkflowStore((s) => s.reset);

  const githubRepo = useWorkflowStore((s) => s.githubRepo);
  const githubPrNumber = useWorkflowStore((s) => s.githubPrNumber);
  const setGithubRepo = useWorkflowStore((s) => s.setGithubRepo);
  const setGithubPrNumber = useWorkflowStore((s) => s.setGithubPrNumber);

  const { analyzePR } = useAnalyze();

  const canAnalyze = input.trim().length > 0 && ANALYZABLE_STAGES.includes(stage);
  const canAnalyzePR =
    githubRepo.includes("/") &&
    githubPrNumber.trim().length > 0 &&
    ANALYZABLE_STAGES.includes(stage);
  const isRunning = !ANALYZABLE_STAGES.includes(stage);

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

  const runningButtonClass =
    stage === "analyzing" || stage === "tokenizing"
      ? "bg-bg-amber-muted text-swv-amber border-border-amber-muted"
      : stage === "executing"
      ? "bg-bg-blue-muted text-swv-blue border-border-blue-muted"
      : "bg-transparent text-text-dim border-border-dim";

  const runningLabel =
    stage === "analyzing" || stage === "tokenizing" ? (
      <><Spinner /> Analyzing…</>
    ) : stage === "executing" ? (
      <><Spinner /> Extracting tasks…</>
    ) : null;

  return (
    <div className="flex flex-col gap-2.5 h-full overflow-hidden">
      {/* Mode tabs */}
      <div className="flex gap-1 shrink-0">
        {(["text", "pr"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`font-mono text-[9px] tracking-[0.1em] uppercase px-2.5 py-1 rounded-xs border transition-all duration-150 ${
              mode === m
                ? "bg-bg-accent-muted text-accent border-border-accent-muted"
                : "bg-transparent text-text-dim border-border-dim hover:text-text-sec"
            }`}
          >
            {m === "text" ? "Text" : "GitHub PR"}
          </button>
        ))}
      </div>

      {mode === "text" ? (
        <>
          {/* Input area */}
          <div className="rounded-[3px] px-3 py-2.5 flex flex-col gap-1.5 shrink-0 bg-bg-input border border-border">
            <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-dim">
              Input Text
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter text here..."
              rows={3}
              className="resize-none bg-transparent outline-none text-[13px] leading-normal text-text-pri placeholder:opacity-30"
            />
          </div>

          {/* Stats */}
          <div className="flex gap-4 shrink-0">
            <StatItem label="Tokens" value={tokenCount} />
            <StatItem label="Chars" value={charCount} />
            <StatItem label="Ratio" value={ratio} />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setStage("tokenizing")}
              disabled={!canAnalyze}
              className={`flex-1 font-mono text-[9px] tracking-[0.08em] uppercase px-3 py-1.25 rounded-xs border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${
                canAnalyze
                  ? "bg-bg-accent-muted text-accent border-border-accent-muted"
                  : runningButtonClass
              }`}
            >
              {isRunning ? runningLabel : "▶ Start Analysis"}
            </button>
            <button
              onClick={() => reset()}
              className="font-mono text-[9px] tracking-[0.08em] uppercase px-3 py-1.25 rounded-xs border border-border-dim text-text-dim transition-all duration-150 hover:text-swv-red hover:border-swv-red"
            >
              Reset
            </button>
          </div>

          {/* Token grid */}
          <div className="flex flex-wrap gap-1 overflow-y-auto flex-1 content-start">
            {tokens.map((token, i) => {
              const display = token.text.trim() === "" ? "·" : token.text;
              return (
                <div
                  key={`${i}-${token.id}`}
                  className={`flex flex-col items-center gap-px min-w-7 px-1.5 py-0.75 rounded-xs ${TOKEN_CHIP_CLASSES[token.colorIndex]}`}
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
        </>
      ) : (
        <>
          {/* GitHub PR inputs */}
          <div className="rounded-[3px] px-3 py-2.5 flex flex-col gap-2.5 shrink-0 bg-bg-input border border-border">
            <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-dim">
              Repository
            </div>
            <input
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="owner/repo"
              className="bg-transparent outline-none text-[13px] leading-normal text-text-pri placeholder:opacity-30"
            />
            <div className="border-t border-border" />
            <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-dim">
              PR Number
            </div>
            <input
              value={githubPrNumber}
              onChange={(e) => setGithubPrNumber(e.target.value)}
              placeholder="e.g. 42"
              type="number"
              min="1"
              className="bg-transparent outline-none text-[13px] leading-normal text-text-pri placeholder:opacity-30 w-28"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => analyzePR(githubRepo, githubPrNumber)}
              disabled={!canAnalyzePR}
              className={`flex-1 font-mono text-[9px] tracking-[0.08em] uppercase px-3 py-1.25 rounded-xs border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${
                canAnalyzePR
                  ? "bg-bg-accent-muted text-accent border-border-accent-muted"
                  : runningButtonClass
              }`}
            >
              {isRunning ? runningLabel : "▶ Analyze PR"}
            </button>
            <button
              onClick={() => reset()}
              className="font-mono text-[9px] tracking-[0.08em] uppercase px-3 py-1.25 rounded-xs border border-border-dim text-text-dim transition-all duration-150 hover:text-swv-red hover:border-swv-red"
            >
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="font-mono text-[18px] font-bold leading-none text-accent">
        {value}
      </div>
      <div className="text-[9px] tracking-[0.1em] uppercase text-text-dim">
        {label}
      </div>
    </div>
  );
}
