"use client";

import { useWorkflowStore } from "@/store/workflowStore";

export function PromptLog() {
  const promptLog = useWorkflowStore((s) => s.promptLog);
  const input = useWorkflowStore((s) => s.input);

  if (!promptLog) {
    return (
      <div className="h-full flex items-center justify-center font-mono text-[11px] tracking-[0.06em] text-text-dim">
        — No log —
      </div>
    );
  }

  let parsed: { system?: string } = {};
  try {
    parsed = JSON.parse(promptLog);
  } catch {
    // Display as raw text if parsing fails
    parsed = { system: promptLog };
  }

  return (
    <div className="h-full overflow-y-auto font-mono text-[10px] leading-[1.6] space-y-[10px]">
      {/* SYSTEM section */}
      {parsed.system && (
        <div>
          <div className="text-[8px] tracking-[0.12em] uppercase text-text-dim mb-[4px]">
            [SYSTEM]
          </div>
          <pre className="whitespace-pre-wrap break-words text-swv-blue opacity-80">
            {parsed.system}
          </pre>
        </div>
      )}

      {/* USER section — display input if analysis has started */}
      {input.trim() && (
        <div>
          <div className="text-[8px] tracking-[0.12em] uppercase text-text-dim mb-[4px]">
            [USER]
          </div>
          <pre className="whitespace-pre-wrap break-words text-accent opacity-80">
            {input}
          </pre>
        </div>
      )}
    </div>
  );
}
