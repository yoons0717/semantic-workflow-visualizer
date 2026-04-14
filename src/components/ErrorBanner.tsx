"use client";

import { useWorkflowStore } from "@/store/workflowStore";

export function ErrorBanner() {
  const errorMessage = useWorkflowStore((s) => s.errorMessage);
  const reset = useWorkflowStore((s) => s.reset);

  return (
    <div className="h-full flex flex-col items-center justify-center gap-3">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-swv-red">
          Error
        </span>
        <span className="font-mono text-[11px] text-text-sec">
          {errorMessage ?? "분석 중 오류가 발생했습니다"}
        </span>
      </div>
      <button
        onClick={reset}
        className="font-mono text-[9px] tracking-[0.08em] uppercase px-3 py-1.25 rounded-xs border border-swv-red/40 text-swv-red hover:bg-swv-red/10 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
