"use client";

interface PipelineBadgeProps {
  variant: "idle" | "active" | "warn";
  children: React.ReactNode;
}

const variantClasses: Record<PipelineBadgeProps["variant"], string> = {
  idle:   "bg-bg-raised text-text-sec border border-border",
  active: "bg-accent-dim text-accent border border-[#00d4a840]",
  warn:   "bg-amber-dim text-swv-amber border border-[#f5a62340]",
};

export function PipelineBadge({ variant, children }: PipelineBadgeProps) {
  return (
    <span
      className={`font-mono text-[10px] px-2 py-0.75 rounded-xs tracking-[0.05em] font-medium ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
