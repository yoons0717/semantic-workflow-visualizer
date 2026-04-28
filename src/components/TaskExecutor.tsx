"use client";

import { useCallback, useEffect } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { executeTask } from "@/lib/mockWebhook";
import { TaskCard } from "@/components/TaskCard";
import { EmptyState } from "@/components/EmptyState";
import { Spinner } from "@/components/Spinner";
import type { WorkflowTask } from "@/types";

const TERMINAL_STATUSES: WorkflowTask["status"][] = ["success", "rejected", "failed"];

export function TaskExecutor() {
  const tasks = useWorkflowStore((s) => s.tasks);
  const stage = useWorkflowStore((s) => s.stage);
  const setTasks = useWorkflowStore((s) => s.setTasks);
  const setStage = useWorkflowStore((s) => s.setStage);
  const notionDatabases = useWorkflowStore((s) => s.notionDatabases);
  const setNotionDatabases = useWorkflowStore((s) => s.setNotionDatabases);
  const autoApproveNotion = useWorkflowStore((s) => s.autoApproveNotion);
  const notionTargetDatabaseId = useWorkflowStore((s) => s.notionTargetDatabaseId);
  const setAutoApproveNotion = useWorkflowStore((s) => s.setAutoApproveNotion);

  useEffect(() => {
    const hasNotionTask = tasks.some((t) => t.type === "notion");
    if (hasNotionTask && notionDatabases.length === 0) {
      fetch("/api/notion/databases")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setNotionDatabases(data); })
        .catch(() => {});
    }
  }, [tasks, notionDatabases.length, setNotionDatabases]);

  const updateTask = useCallback(
    (id: string, patch: Partial<WorkflowTask>) => {
      const current = useWorkflowStore.getState().tasks;
      setTasks(current.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [setTasks]
  );

  const checkAllDone = useCallback(() => {
    const current = useWorkflowStore.getState().tasks;
    if (current.length > 0 && current.every((t) => TERMINAL_STATUSES.includes(t.status))) {
      setStage("done");
    }
  }, [setStage]);

  const handleApprove = useCallback(
    async (taskId: string, updatedPayload: Record<string, string>) => {
      const task = useWorkflowStore.getState().tasks.find((t) => t.id === taskId);
      if (!task) return;

      const taskWithPayload = { ...task, payload: updatedPayload };
      updateTask(taskId, { status: "running", payload: updatedPayload });

      try {
        const result = await executeTask(taskWithPayload);
        updateTask(taskId, {
          status: result.success ? "success" : "failed",
          ...(result.notionPageUrl ? { notionPageUrl: result.notionPageUrl } : {}),
        });
      } catch {
        updateTask(taskId, { status: "failed" });
      } finally {
        checkAllDone();
      }
    },
    [updateTask, checkAllDone]
  );

  const handleReject = useCallback(
    (taskId: string) => {
      updateTask(taskId, { status: "rejected" });
      checkAllDone();
    },
    [updateTask, checkAllDone]
  );

  // PR 분석 모드: notion 태스크 자동 승인
  useEffect(() => {
    if (!autoApproveNotion || !notionTargetDatabaseId) return;
    const pendingNotionTasks = useWorkflowStore
      .getState()
      .tasks.filter((t) => t.type === "notion" && t.status === "pending");
    if (pendingNotionTasks.length === 0) return;
    pendingNotionTasks.forEach((t) => {
      handleApprove(t.id, { ...t.payload, database_id: notionTargetDatabaseId });
    });
    setAutoApproveNotion(false);
  }, [tasks, autoApproveNotion, notionTargetDatabaseId, handleApprove, setAutoApproveNotion]);

  if (tasks.length === 0) {
    if (stage === "executing") {
      return (
        <EmptyState className="text-swv-amber">
          <Spinner size="md" />
          Extracting tasks…
        </EmptyState>
      );
    }
    return <EmptyState>— No tasks extracted —</EmptyState>;
  }

  return (
    <div className="h-full flex items-start gap-3 overflow-x-auto pb-1">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onApprove={(payload) => handleApprove(task.id, payload)}
          onReject={() => handleReject(task.id)}
        />
      ))}
    </div>
  );
}
