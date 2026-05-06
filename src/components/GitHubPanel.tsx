"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { useAnalyze } from "@/hooks/useAnalyze";
import { useFavorites } from "@/hooks/useFavorites";
import { Spinner } from "@/components/Spinner";
import type { PipelineStage } from "@/types";

const FavoriteChips = dynamic(
  () => import("@/components/FavoriteChips").then((m) => m.FavoriteChips),
  { ssr: false },
);

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

  const { toggle, isFavorite } = useFavorites();

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
    <div className="flex flex-col gap-2.5 h-full overflow-y-auto">
      {/* Favorites chips — ssr:false로 하이드레이션 불일치 방지 */}
      <FavoriteChips selectedRepo={githubRepo} onSelect={selectRepo} />

      {/* GitHub PR selects */}
      <div className="rounded-[3px] px-3 py-2.5 flex flex-col gap-2.5 shrink-0 bg-bg-input border border-border">
        <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-dim">
          Repository
        </div>
        {reposError ? (
          <>
            <p className="text-[11px] text-text-dim leading-relaxed">
              GitHub 연동 없이 퍼블릭 레포를 직접 입력할 수 있어요.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="owner/repo (예: facebook/react)"
                value={githubRepo}
                onChange={(e) => selectRepo(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[13px] leading-normal text-text-pri placeholder:text-text-dim/50"
              />
              <button
                onClick={() => toggle(githubRepo)}
                disabled={!githubRepo}
                title={isFavorite(githubRepo) ? "Remove from favorites" : "Add to favorites"}
                className="text-[13px] leading-none transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110"
              >
                {isFavorite(githubRepo) ? "★" : "☆"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={githubRepo}
              onChange={(e) => selectRepo(e.target.value)}
              disabled={reposLoading}
              className="flex-1 bg-transparent outline-none text-[13px] leading-normal text-text-pri disabled:opacity-30"
            >
              <option value="">
                {reposLoading ? "Loading…" : "Select a repository"}
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
        )}

        <div className="border-t border-border" />

        <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-dim">
          Pull Request
        </div>
        {reposError || prsError ? (
          <>
            {prsError && !reposError && (
              <p className="text-[11px] text-text-dim leading-relaxed">
                PR 목록을 불러오지 못했어요. 번호를 직접 입력하세요.
              </p>
            )}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="PR 번호 (예: 42)"
              value={githubPrNumber}
              onChange={(e) => setGithubPrNumber(e.target.value.replace(/\D/g, ""))}
              disabled={!githubRepo}
              className="bg-transparent outline-none text-[13px] leading-normal text-text-pri placeholder:text-text-dim/50 disabled:opacity-30"
            />
          </>
        ) : (
          <select
            value={githubPrNumber}
            onChange={(e) => setGithubPrNumber(e.target.value)}
            disabled={!githubRepo || prsLoading}
            className="bg-transparent outline-none text-[13px] leading-normal text-text-pri disabled:opacity-30"
          >
            <option value="">
              {!githubRepo
                ? "Select a repository first"
                : prsLoading
                ? "Loading…"
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
        )}
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
