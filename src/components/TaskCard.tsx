"use client";

import { useState } from "react";
import type { WorkflowTask } from "@/types";

interface TaskCardProps {
  task: WorkflowTask;
  onApprove: (payload: Record<string, string>) => void;
  onReject: () => void;
}

const TYPE_COLORS: Record<WorkflowTask["type"], string> = {
  slack: "text-[#4faee8] border-[#4faee840]",
  jira: "text-[#a78bfa] border-[#a78bfa40]",
  email: "text-swv-amber border-[#f5a62340]",
  generic: "text-text-sec border-border",
};

const STATUS_CONFIG: Record<
  WorkflowTask["status"],
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "text-swv-amber" },
  approved: { label: "Approved", className: "text-accent" },
  rejected: { label: "Rejected", className: "text-text-dim" },
  running: { label: "Running", className: "text-[#4faee8]" },
  success: { label: "Done", className: "text-accent" },
  failed: { label: "Failed", className: "text-swv-red" },
};

export function TaskCard({ task, onApprove, onReject }: TaskCardProps) {
  const [payload, setPayload] = useState<Record<string, string>>(task.payload);

  const isTerminal = ["rejected", "running", "success", "failed"].includes(task.status);
  const statusCfg = STATUS_CONFIG[task.status];

  function handlePayloadChange(key: string, value: string) {
    setPayload((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div
      className={`flex flex-col gap-2 min-w-55 max-w-65 shrink-0 rounded-[3px] border p-3 transition-opacity duration-300 ${
        task.status === "rejected" ? "opacity-40 border-border-dim" : "border-border bg-bg-raised"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span
          className={`font-mono text-[9px] px-1.25 py-0.5 rounded-xs border uppercase tracking-[0.06em] ${TYPE_COLORS[task.type]}`}
        >
          {task.type}
        </span>
        <span className={`ml-auto font-mono text-[9px] tracking-[0.05em] ${statusCfg.className}`}>
          {task.status === "running" ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4faee8] animate-pulse" />
              {statusCfg.label}
            </span>
          ) : (
            statusCfg.label
          )}
        </span>
      </div>

      {/* Title */}
      <div className="font-mono text-[11px] font-semibold text-text-pri leading-[1.4] line-clamp-2">
        {task.title}
      </div>

      {/* Description */}
      <div className="text-[10px] text-text-sec leading-normal line-clamp-2">
        {task.description}
      </div>

      {/* Payload */}
      <div className="flex flex-col gap-1.25 mt-1">
        {Object.entries(payload).map(([key, value]) => (
          <div key={key} className="flex flex-col gap-0.5">
            <span className="font-mono text-[8px] tracking-[0.06em] text-text-dim uppercase">
              {key}
            </span>
            <input
              type="text"
              value={value}
              onChange={(e) => handlePayloadChange(key, e.target.value)}
              disabled={isTerminal}
              className="w-full bg-bg-panel border border-border-dim rounded-xs px-1.5 py-0.75 font-mono text-[10px] text-text-pri focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-default"
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      {task.status === "pending" && (
        <div className="flex gap-2 mt-1 pt-2 border-t border-border-dim">
          <button
            onClick={() => onApprove(payload)}
            className="flex-1 font-mono text-[9px] tracking-[0.06em] uppercase py-1.25 rounded-xs bg-accent-dim text-accent border border-[#00d4a840] hover:bg-[#00d4a820] transition-colors"
          >
            Approve
          </button>
          <button
            onClick={onReject}
            className="flex-1 font-mono text-[9px] tracking-[0.06em] uppercase py-1.25 rounded-xs text-text-dim border border-border-dim hover:text-text-sec hover:border-border transition-colors"
          >
            Reject
          </button>
        </div>
      )}

      {task.status === "success" && (
        <div className="mt-1 pt-2 border-t border-border-dim font-mono text-[9px] text-accent tracking-[0.05em]">
          ✓ Executed
        </div>
      )}
      {task.status === "failed" && (
        <div className="mt-1 pt-2 border-t border-border-dim font-mono text-[9px] text-swv-red tracking-[0.05em]">
          ✗ Failed
        </div>
      )}
    </div>
  );
}
