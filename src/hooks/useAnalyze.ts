"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";

export function useAnalyze() {
  const setStage = useWorkflowStore((s) => s.setStage);
  const appendStreamedText = useWorkflowStore((s) => s.appendStreamedText);
  const setPromptLog = useWorkflowStore((s) => s.setPromptLog);

  const analyze = useCallback(
    async (input: string) => {
      setStage("analyzing");

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: input }],
          }),
        });

        const promptLog = res.headers.get("x-prompt-log");
        if (promptLog) setPromptLog(decodeURIComponent(promptLog));

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          appendStreamedText(decoder.decode(value, { stream: true }));
        }

        setStage("done");
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[useAnalyze] 분석 요청 실패:", err);
        }
        setStage("error");
      }
    },
    [setStage, appendStreamedText, setPromptLog]
  );

  return { analyze };
}
