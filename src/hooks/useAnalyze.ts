"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";

export function useAnalyze() {
  const setStage = useWorkflowStore((s) => s.setStage);
  const appendStreamedText = useWorkflowStore((s) => s.appendStreamedText);
  const clearStreamedText = useWorkflowStore((s) => s.clearStreamedText);
  const setPromptLog = useWorkflowStore((s) => s.setPromptLog);
  const setTasks = useWorkflowStore((s) => s.setTasks);

  const analyze = useCallback(
    async (input: string) => {
      clearStreamedText();
      setTasks([]);
      setStage("analyzing");

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: input }],
          }),
        });

        if (!res.ok) throw new Error(`API error: ${res.status}`);

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

        // 스트리밍 완료 후 태스크 추출
        setStage("executing");
        try {
          const analysisText = useWorkflowStore.getState().streamedText;
          const taskRes = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ analysisText }),
          });
          const raw = taskRes.ok ? await taskRes.json() : [];
          const tasks = Array.isArray(raw) ? raw : [];
          setTasks(tasks);
          // setStage('done')은 TaskExecutor에서 모든 태스크 완료 시 호출.
          // 태스크가 없으면 여기서 바로 done으로 전환.
          if (tasks.length === 0) setStage("done");
        } catch {
          setTasks([]);
          setStage("done");
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[useAnalyze] 분석 요청 실패:", err);
        }
        setStage("error");
      }
    },
    [setStage, appendStreamedText, clearStreamedText, setPromptLog, setTasks]
  );

  return { analyze };
}
