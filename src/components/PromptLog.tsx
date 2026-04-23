"use client";

import { useWorkflowStore } from "@/store/workflowStore";
import { EmptyState } from "@/components/EmptyState";

function PromptLogContent({ promptLog }: { promptLog: string }) {
  const input = useWorkflowStore((s) => s.input);

  let parsed: { system?: string } = {};
  try {
    parsed = JSON.parse(promptLog);
  } catch {
    parsed = { system: promptLog };
  }

  return (
    <div className="h-full overflow-y-auto font-mono text-[10px] leading-[1.6] space-y-2.5">
      {parsed.system && (
        <div>
          <div className="text-[8px] tracking-[0.12em] uppercase text-text-dim mb-1">
            [SYSTEM]
          </div>
          <pre className="whitespace-pre-wrap wrap-break-word text-swv-blue opacity-80">
            {parsed.system}
          </pre>
        </div>
      )}
      {input.trim() && (
        <div>
          <div className="text-[8px] tracking-[0.12em] uppercase text-text-dim mb-1">
            [USER]
          </div>
          <pre className="whitespace-pre-wrap wrap-break-word text-accent opacity-80">
            {input}
          </pre>
        </div>
      )}
    </div>
  );
}

export function PromptLog() {
  const promptLog = useWorkflowStore((s) => s.promptLog);
  if (!promptLog) return <EmptyState>— No log —</EmptyState>;
  return <PromptLogContent promptLog={promptLog} />;
}
