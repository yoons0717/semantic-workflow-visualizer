"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import type { WorkflowTask } from "@/types";

// 입력 텍스트와 knowledge base 항목 간 코사인 유사도 반환
async function fetchEmbeddings(
  input: string,
): Promise<Record<string, number>> {
  const res = await fetch("/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: input }),
  });
  if (!res.ok) return {};
  const data = await res.json();
  return data?.similarities ?? {};
}

// LLM 분석 결과를 스트리밍으로 수신, 청크마다 onChunk 호출
async function streamAnalysis(
  input: string,
  onChunk: (text: string) => void,
  onPromptLog: (log: string) => void,
) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: input }] }),
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
  const setSimilarities = useWorkflowStore((s) => s.setSimilarities);
  const setErrorMessage = useWorkflowStore((s) => s.setErrorMessage);

  const analyze = useCallback(
    async (input: string) => {
      clearStreamedText();
      setTasks([]);
      setStage("analyzing");

      void fetchEmbeddings(input).then(setSimilarities).catch(() => {});

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
    [setStage, appendStreamedText, clearStreamedText, setPromptLog, setTasks, setSimilarities, setErrorMessage],
  );

  return { analyze };
}
