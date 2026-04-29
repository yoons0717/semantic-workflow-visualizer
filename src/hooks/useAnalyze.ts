"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import type { WorkflowTask } from "@/types";

// LLM 분석 결과를 스트리밍으로 수신, 청크마다 onChunk 호출
async function streamAnalysis(
  input: string,
  onChunk: (text: string) => void,
  onPromptLog: (log: string) => void,
  mode?: 'pr',
) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: input }], mode }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const promptLog = res.headers.get("x-prompt-log");
  if (promptLog) onPromptLog(decodeURIComponent(promptLog));

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

// 분석 텍스트에서 실행할 태스크 목록 추출
async function extractTasks(analysisText: string): Promise<WorkflowTask[]> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysisText }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const raw = await res.json();
  return Array.isArray(raw) ? raw : [];
}

export function useAnalyze() {
  const setStage = useWorkflowStore((s) => s.setStage);
  const appendStreamedText = useWorkflowStore((s) => s.appendStreamedText);
  const clearStreamedText = useWorkflowStore((s) => s.clearStreamedText);
  const setPromptLog = useWorkflowStore((s) => s.setPromptLog);
  const setTasks = useWorkflowStore((s) => s.setTasks);
  const setErrorMessage = useWorkflowStore((s) => s.setErrorMessage);
  const analyze = useCallback(
    async (input: string) => {
      clearStreamedText();
      setTasks([]);
      setStage("analyzing");

      try {
        await streamAnalysis(input, appendStreamedText, setPromptLog);
      } catch {
        setErrorMessage("분석 중 오류가 발생했습니다");
        setStage("error");
        return;
      }

      setStage("executing");
      const analysisText = useWorkflowStore.getState().streamedText;
      try {
        const tasks = await extractTasks(analysisText);
        setTasks(tasks);
        if (tasks.length === 0) setStage("done");
      } catch {
        setErrorMessage("태스크 추출 중 오류가 발생했습니다");
        setStage("error");
      }
    },
    [setStage, appendStreamedText, clearStreamedText, setPromptLog, setTasks, setErrorMessage],
  );

  const analyzePR = useCallback(
    async (repo: string, prNumber: string) => {
      clearStreamedText();
      setTasks([]);
      setStage("analyzing");

      try {
        const prRes = await fetch(
          `/api/github/pr?repo=${encodeURIComponent(repo)}&pr=${encodeURIComponent(prNumber)}`,
        );
        if (!prRes.ok) throw new Error(`GitHub API error: ${prRes.status}`);
        const data = await prRes.json();
        const title = data.title as string;
        const body = (data.body as string) ?? '';
        const diff = data.diff as string;
        const input = `PR: ${title}${body ? `\n\nDescription:\n${body}` : ''}\n\nDiff:\n${diff}`;

        await streamAnalysis(input, appendStreamedText, setPromptLog, 'pr');
      } catch {
        setErrorMessage("PR 분석 중 오류가 발생했습니다");
        setStage("error");
        return;
      }

      setStage("executing");
      const analysisText = useWorkflowStore.getState().streamedText;
      try {
        const tasks = await extractTasks(analysisText);
        const tagged = tasks.map((t) =>
          t.type === "notion"
            ? { ...t, payload: { ...t.payload, title: `[#${prNumber}] ${t.payload.title}` } }
            : t
        );
        setTasks(tagged);
        if (tagged.length === 0) setStage("done");
      } catch {
        setErrorMessage("태스크 추출 중 오류가 발생했습니다");
        setStage("error");
      }
    },
    [setStage, appendStreamedText, clearStreamedText, setPromptLog, setTasks, setErrorMessage],
  );

  return { analyze, analyzePR };
}
