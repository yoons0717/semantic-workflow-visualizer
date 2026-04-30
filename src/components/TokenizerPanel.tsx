"use client";

import { useWorkflowStore } from "@/store/workflowStore";
import { useAnalyze } from "@/hooks/useAnalyze";
import { Spinner } from "@/components/Spinner";
import type { PipelineStage } from "@/types";

const ANALYZABLE_STAGES: readonly PipelineStage[] = ["idle", "done", "error"];

export function TokenizerPanel() {
  const stage = useWorkflowStore((s) => s.stage);
  const reset = useWorkflowStore((s) => s.reset);

  const githubRepo = useWorkflowStore((s) => s.githubRepo);
  const githubPrNumber = useWorkflowStore((s) => s.githubPrNumber);
  const setGithubRepo = useWorkflowStore((s) => s.setGithubRepo);
  const setGithubPrNumber = useWorkflowStore((s) => s.setGithubPrNumber);

  const { analyzePR } = useAnalyze();

  const canAnalyzePR =
    githubRepo.includes("/") &&
    githubPrNumber.trim().length > 0 &&
    ANALYZABLE_STAGES.includes(stage);
  const isRunning = !ANALYZABLE_STAGES.includes(stage);

  const runningButtonClass =
    stage === "analyzing"
      ? "bg-bg-amber-muted text-swv-amber border-border-amber-muted"
      : stage === "executing"
      ? "bg-bg-blue-muted text-swv-blue border-border-blue-muted"
      : "bg-transparent text-text-dim border-border-dim";

  const runningLabel =
    stage === "analyzing" ? (
      <><Spinner /> Analyzing…</>
    ) : stage === "executing" ? (
      <><Spinner /> Extracting tasks…</>
    ) : null;

  return (
    <div className="flex flex-col gap-2.5 h-full overflow-hidden">
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
    </div>
  );
}
