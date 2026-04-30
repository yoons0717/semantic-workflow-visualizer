"use client";

interface EmptyStateProps {
  children: React.ReactNode;
  className?: string;
}

export function EmptyState({ children, className = "text-text-dim" }: EmptyStateProps) {
  return (
    <div
      className={`h-full flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.06em] ${className}`}
    >
      {children}
    </div>
  );
}
