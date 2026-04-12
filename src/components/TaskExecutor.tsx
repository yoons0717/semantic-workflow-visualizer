"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { executeTask } from "@/lib/mockWebhook";
import { TaskCard } from "@/components/TaskCard";
import type { WorkflowTask } from "@/types";

const TERMINAL_STATUSES: WorkflowTask["status"][] = ["success", "rejected", "failed"];

export function TaskExecutor() {
  const tasks = useWorkflowStore((s) => s.tasks);
  const setTasks = useWorkflowStore((s) => s.setTasks);
  const setStage = useWorkflowStore((s) => s.setStage);

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
        updateTask(taskId, { status: result.success ? "success" : "failed" });
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

  if (tasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center font-mono text-[11px] tracking-[0.06em] text-text-dim">
        — No tasks extracted —
      </div>
    );
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
