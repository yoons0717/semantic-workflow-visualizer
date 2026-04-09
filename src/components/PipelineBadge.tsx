"use client";

interface PipelineBadgeProps {
  variant: "idle" | "active" | "warn";
  children: React.ReactNode;
}

const styles: Record<PipelineBadgeProps["variant"], React.CSSProperties> = {
  idle: {
    background: "var(--bg-raised)",
    color: "var(--text-sec)",
    border: "1px solid var(--border)",
  },
  active: {
    background: "var(--accent-dim)",
    color: "var(--accent)",
    border: "1px solid #00d4a840",
  },
  warn: {
    background: "var(--amber-dim)",
    color: "var(--amber)",
    border: "1px solid #f5a62340",
  },
};

export function PipelineBadge({ variant, children }: PipelineBadgeProps) {
  return (
    <span
      className="text-[10px] px-2 py-[3px] rounded-[2px] tracking-[0.05em] font-medium"
      style={{
        fontFamily: "var(--font-jetbrains-mono), monospace",
        ...styles[variant],
      }}
    >
      {children}
    </span>
  );
}
