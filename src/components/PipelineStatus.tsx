"use client";

import { useWorkflowStore } from "@/store/workflowStore";
import type { PipelineStage } from "@/types";

type StepState = "done" | "active" | "dim";

const STEPS = ["입력", "토큰화", "시맨틱 분석", "태스크 추출", "실행"];

const STAGE_MAP: Record<PipelineStage, StepState[]> = {
  idle:       ["dim",  "dim",  "dim",    "dim",    "dim"],
  tokenizing: ["done", "active", "dim",  "dim",    "dim"],
  analyzing:  ["done", "done", "active", "dim",    "dim"],
  executing:  ["done", "done", "done",   "active", "dim"],
  done:       ["done", "done", "done",   "done",   "done"],
  error:      ["done", "done", "dim",    "dim",    "dim"],
};

const DOT_CLASSES: Record<StepState, string> = {
  done:   "bg-accent shadow-[0_0_8px_var(--accent)]",
  active: "bg-swv-amber shadow-[0_0_8px_var(--amber)] animate-[blink_1s_ease_infinite]",
  dim:    "bg-text-dim",
};

const LABEL_CLASSES: Record<StepState, string> = {
  done:   "text-accent",
  active: "text-swv-amber",
  dim:    "text-text-dim",
};

export function PipelineStatus() {
  const stage = useWorkflowStore((s) => s.stage);
  const stepStates = STAGE_MAP[stage];

  return (
    <div className="h-[38px] flex items-center px-5 shrink-0 bg-bg-panel border-b border-border-dim">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-2 px-4 relative">
          {i < STEPS.length - 1 && (
            <div className="absolute right-[-1px] top-1/2 -translate-y-1/2 w-[18px] h-px bg-border" />
          )}
          <div className={`w-[6px] h-[6px] rounded-full transition-all duration-300 ${DOT_CLASSES[stepStates[i]]}`} />
          <span className={`font-mono text-[10px] tracking-[0.08em] uppercase transition-colors duration-300 ${LABEL_CLASSES[stepStates[i]]}`}>
            {step}
          </span>
        </div>
      ))}
      <div className="ml-auto font-mono text-[10px] text-text-sec">
        {stage === "idle" && "대기 중"}
        {stage === "tokenizing" && "토큰화 중 ···"}
        {stage === "analyzing" && "분석 중 ···"}
        {stage === "executing" && "실행 중 ···"}
        {stage === "done" && "완료"}
        {stage === "error" && "오류 발생"}
      </div>
    </div>
  );
}
