"use client";

import { useEffect, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useAnalyze } from "@/hooks/useAnalyze";
import { useFavorites } from "@/hooks/useFavorites";
import { Spinner } from "@/components/Spinner";
import type { PipelineStage } from "@/types";

type Repo = { full_name: string; private: boolean };
type PR = { number: number; title: string };

const ANALYZABLE_STAGES: readonly PipelineStage[] = ["idle", "done", "error"];

const fetchJSON = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });

export function GitHubPanel() {
  const stage = useWorkflowStore((s) => s.stage);
  const reset = useWorkflowStore((s) => s.reset);

  const githubRepo = useWorkflowStore((s) => s.githubRepo);
  const githubPrNumber = useWorkflowStore((s) => s.githubPrNumber);
  const setGithubRepo = useWorkflowStore((s) => s.setGithubRepo);
  const setGithubPrNumber = useWorkflowStore((s) => s.setGithubPrNumber);

  const [repos, setRepos] = useState<Repo[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [reposError, setReposError] = useState<string | null>(null);

  const [prs, setPrs] = useState<PR[]>([]);
  const [prsFor, setPrsFor] = useState<string>("");
  const [prsError, setPrsError] = useState<string | null>(null);
  const prsLoading = !!githubRepo && prsFor !== githubRepo && !prsError;

  const { favorites, toggle, isFavorite } = useFavorites();

  const { analyzePR } = useAnalyze();

  useEffect(() => {
    let cancelled = false;
    fetchJSON("/api/github/repos")
      .then((data) => { if (!cancelled) setRepos(data); })
      .catch(() => { if (!cancelled) setReposError("Failed to load repos"); })
      .finally(() => { if (!cancelled) setReposLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!githubRepo) return;
    let cancelled = false;
    fetchJSON(`/api/github/prs?repo=${encodeURIComponent(githubRepo)}`)
      .then((data: PR[]) => {
        if (cancelled) return;
        setPrs(data);
        setPrsFor(githubRepo);
      })
      .catch(() => { if (!cancelled) setPrsError("Failed to load PRs"); });
    return () => { cancelled = true; };
  }, [githubRepo]);

  const canAnalyzePR =
    githubRepo.includes("/") &&
    githubPrNumber.trim().length > 0 &&
    ANALYZABLE_STAGES.includes(stage);
  const isRunning = !ANALYZABLE_STAGES.includes(stage);

  const runningButtonClass =
    stage === "analyzing"
      ? "bg-bg-amber-muted text-swv-amber border-border-amber-muted"
      : stage === "executing"
      ? "bg-bg-blue-muted text-swv-blue border-border-blue-muted"
      : "bg-transparent text-text-dim border-border-dim";

  const runningLabel =
    stage === "analyzing" ? (
      <><Spinner /> Analyzing…</>
    ) : stage === "executing" ? (
      <><Spinner /> Extracting tasks…</>
    ) : null;

  const selectRepo = (repo: string) => {
    setGithubRepo(repo);
    setGithubPrNumber("");
    if (repo !== githubRepo) {
      setPrsFor("");
      setPrsError(null);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 h-full overflow-hidden">
      {/* Favorites chips */}
      {favorites.length > 0 && (
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {favorites.map((repo) => (
            <button
              key={repo}
              onClick={() => selectRepo(repo)}
              className={`font-mono text-[9px] tracking-[0.06em] px-2 py-0.5 rounded-xs border transition-all duration-150 ${
                githubRepo === repo
                  ? "border-accent text-accent bg-bg-accent-muted"
                  : "border-border text-text-sec hover:border-accent hover:text-accent"
              }`}
            >
              ★ {repo}
            </button>
          ))}
        </div>
      )}

      {/* GitHub PR selects */}
      <div className="rounded-[3px] px-3 py-2.5 flex flex-col gap-2.5 shrink-0 bg-bg-input border border-border">
        <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-dim">
          Repository
        </div>
        <div className="flex items-center gap-2">
          <select
            value={githubRepo}
            onChange={(e) => selectRepo(e.target.value)}
            disabled={reposLoading || !!reposError}
            className="flex-1 bg-transparent outline-none text-[13px] leading-normal text-text-pri disabled:opacity-30"
          >
            <option value="">
              {reposLoading
                ? "Loading…"
                : reposError
                ? "Failed to load"
                : "Select a repository"}
            </option>
            {repos.map((r) => (
              <option key={r.full_name} value={r.full_name}>
                {r.private ? "🔒 " : ""}{r.full_name}
              </option>
            ))}
          </select>
          <button
            onClick={() => toggle(githubRepo)}
            disabled={!githubRepo}
            title={isFavorite(githubRepo) ? "Remove from favorites" : "Add to favorites"}
            className="text-[13px] leading-none transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110"
          >
            {isFavorite(githubRepo) ? "★" : "☆"}
          </button>
        </div>

        <div className="border-t border-border" />

        <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-dim">
          Pull Request
        </div>
        <select
          value={githubPrNumber}
          onChange={(e) => setGithubPrNumber(e.target.value)}
          disabled={!githubRepo || prsLoading || !!prsError}
          className="bg-transparent outline-none text-[13px] leading-normal text-text-pri disabled:opacity-30"
        >
          <option value="">
            {!githubRepo
              ? "Select a repository first"
              : prsLoading
              ? "Loading…"
              : prsError
              ? "Failed to load"
              : prs.length === 0
              ? "No open PRs"
              : "Select a PR"}
          </option>
          {prs.map((pr) => (
            <option key={pr.number} value={String(pr.number)}>
              #{pr.number} — {pr.title}
            </option>
          ))}
        </select>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => analyzePR(githubRepo, githubPrNumber)}
          disabled={!canAnalyzePR}
          className={`flex-1 font-mono text-[9px] tracking-[0.08em] uppercase px-3 py-1.25 rounded-xs border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${
            canAnalyzePR
              ? "bg-bg-accent-muted text-accent border-border-accent-muted"
              : runningButtonClass
          }`}
        >
          {isRunning ? runningLabel : "▶ Analyze PR"}
        </button>
        <button
          onClick={() => reset()}
          className="font-mono text-[9px] tracking-[0.08em] uppercase px-3 py-1.25 rounded-xs border border-border-dim text-text-dim transition-all duration-150 hover:text-swv-red hover:border-swv-red"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
