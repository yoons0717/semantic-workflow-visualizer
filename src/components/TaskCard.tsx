"use client";

import { useState } from "react";
import type { WorkflowTask } from "@/types";
import { useWorkflowStore } from "@/store/workflowStore";

interface TaskCardProps {
  task: WorkflowTask;
  onApprove: (payload: Record<string, string>) => void;
  onReject: () => void;
}

const TYPE_COLORS: Record<WorkflowTask["type"], string> = {
  slack:   "text-swv-teal border-swv-teal/25",
  jira:    "text-[#a78bfa] border-[#a78bfa]/25",
  email:   "text-swv-amber border-swv-amber/25",
  generic: "text-text-sec border-border",
  notion:  "text-[#e06c75] border-[#e06c75]/25",
};

const STATUS_CONFIG: Record<
  WorkflowTask["status"],
  { label: string; className: string; footer?: string }
> = {
  pending:  { label: "Pending",  className: "text-swv-amber" },
  approved: { label: "Approved", className: "text-accent" },
  rejected: { label: "Rejected", className: "text-text-dim" },
  running:  { label: "Running",  className: "text-swv-teal" },
  success:  { label: "Done",     className: "text-accent",   footer: "✓ Executed" },
  failed:   { label: "Failed",   className: "text-swv-red",  footer: "✗ Failed" },
};

export function TaskCard({ task, onApprove, onReject }: TaskCardProps) {
  const [payload, setPayload] = useState<Record<string, string>>(task.payload);
  const [selectedDbId, setSelectedDbId] = useState<string>("");
  const notionDatabases = useWorkflowStore((s) => s.notionDatabases);

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
              <span className="w-1.5 h-1.5 rounded-full bg-swv-teal animate-pulse" />
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

      {/* Notion DB selector */}
      {task.type === "notion" && task.status === "pending" && (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[8px] tracking-[0.06em] text-text-dim uppercase">
            Target Database
          </span>
          <select
            value={selectedDbId}
            onChange={(e) => setSelectedDbId(e.target.value)}
            className="w-full bg-bg-panel border border-border-dim rounded-xs px-1.5 py-0.75 font-mono text-[10px] text-text-pri focus:outline-none focus:border-[#e06c75] appearance-none"
          >
            <option value="">— select database —</option>
            {notionDatabases.map((db) => (
              <option key={db.id} value={db.id}>
                {db.icon ? `${db.icon} ` : ""}{db.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Payload */}
      <div className="flex flex-col gap-1.25 mt-1">
        {Object.entries(payload).filter(([key]) => {
          if (key === 'database_id') return false;
          if (task.type === 'notion' && (key === 'status' || key === 'priority')) return false;
          return true;
        }).map(([key, value]) => (
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
            onClick={() => onApprove(task.type === "notion" ? { ...payload, database_id: selectedDbId } : payload)}
            disabled={task.type === "notion" && !selectedDbId}
            className="flex-1 font-mono text-[9px] tracking-[0.06em] uppercase py-1.25 rounded-xs bg-accent-dim text-accent border border-accent/25 hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

      {statusCfg.footer && (
        <div className={`mt-1 pt-2 border-t border-border-dim font-mono text-[9px] tracking-[0.05em] ${statusCfg.className}`}>
          {task.notionPageUrl ? (
            <a
              href={task.notionPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline"
            >
              ↗ Open in Notion
            </a>
          ) : (
            statusCfg.footer
          )}
        </div>
      )}
    </div>
  );
}
