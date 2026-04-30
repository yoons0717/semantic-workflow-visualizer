"use client";

import { useFavorites } from "@/hooks/useFavorites";

interface FavoriteChipsProps {
  selectedRepo: string;
  onSelect: (repo: string) => void;
}

export function FavoriteChips({ selectedRepo, onSelect }: FavoriteChipsProps) {
  const { favorites } = useFavorites();

  if (favorites.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 shrink-0">
      {favorites.map((repo) => (
        <button
          key={repo}
          onClick={() => onSelect(repo)}
          className={`font-mono text-[9px] tracking-[0.06em] px-2 py-0.5 rounded-xs border transition-all duration-150 max-w-[160px] truncate ${
            selectedRepo === repo
              ? "border-accent text-accent bg-bg-accent-muted"
              : "border-border text-text-sec hover:border-accent hover:text-accent"
          }`}
        >
          ★ {repo}
        </button>
      ))}
    </div>
  );
}
