"use client";

import { useEffect, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { EmptyState } from "@/components/EmptyState";
import { Spinner } from "@/components/Spinner";

export function NotionBrowser() {
  const notionDatabases = useWorkflowStore((s) => s.notionDatabases);
  const notionTargetDatabaseId = useWorkflowStore((s) => s.notionTargetDatabaseId);
  const setNotionDatabases = useWorkflowStore((s) => s.setNotionDatabases);
  const setNotionTargetDatabaseId = useWorkflowStore((s) => s.setNotionTargetDatabaseId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchDatabases() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notion/databases");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch");
      setNotionDatabases(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDatabases();
  }, []);

  if (loading) {
    return (
      <EmptyState className="text-text-dim">
        <Spinner size="md" />
        Loading databases…
      </EmptyState>
    );
  }

  if (error) {
    return (
      <EmptyState className="text-text-dim">
        <div className="flex flex-col items-center gap-2">
          <span className="text-red-400">{error}</span>
          <button
            onClick={fetchDatabases}
            className="font-mono text-[10px] px-2 py-1 rounded-xs border border-border-dim text-text-sec hover:border-[var(--purple)] hover:text-[var(--purple)] transition-colors"
          >
            Retry
          </button>
        </div>
      </EmptyState>
    );
  }

  if (notionDatabases.length === 0) {
    return (
      <EmptyState className="text-text-dim">— No databases found —</EmptyState>
    );
  }

  return (
    <div className="h-full flex flex-col gap-1 overflow-y-auto">
      {notionDatabases.map((db) => {
        const isSelected = db.id === notionTargetDatabaseId;
        return (
          <button
            key={db.id}
            onClick={() => setNotionTargetDatabaseId(isSelected ? null : db.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xs text-left transition-colors border ${
              isSelected
                ? "border-l-[var(--purple)] border-[var(--purple)]/30 bg-[var(--purple)]/8 text-text-pri"
                : "border-transparent hover:border-border-dim hover:bg-bg-raised text-text-sec"
            }`}
          >
            {db.icon && (
              <span className="text-[14px] shrink-0 leading-none">{db.icon}</span>
            )}
            <span className="font-mono text-[11px] truncate">{db.title}</span>
          </button>
        );
      })}
    </div>
  );
}
