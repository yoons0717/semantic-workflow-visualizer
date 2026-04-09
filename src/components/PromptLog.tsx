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
    // 파싱 실패 시 raw 텍스트로 표시
    parsed = { system: promptLog };
  }

  return (
    <div className="h-full overflow-y-auto font-mono text-[10px] leading-[1.6] space-y-[10px]">
      {/* SYSTEM 섹션 */}
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

      {/* USER 섹션 — 분석이 시작된 경우 입력값 표시 */}
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
