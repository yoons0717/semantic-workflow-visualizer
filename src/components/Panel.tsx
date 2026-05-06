"use client";

interface PanelProps {
  title: string;
  dotColor: string;
  badge?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Panel({ title, dotColor, badge, actions, children, className = "" }: PanelProps) {
  return (
    <div className={`flex flex-col overflow-hidden bg-bg-panel ${className}`}>
      <div className="h-9 px-4 flex items-center gap-2 shrink-0 border-b border-border-dim">
        {/* dotColor는 JS prop으로 전달되는 동적 값 */}
        <div
          className="w-1.25 h-1.25 rounded-full shrink-0"
          style={{ background: dotColor }}
        />
        <span className="font-condensed text-[11px] font-semibold tracking-[0.14em] uppercase text-text-sec">
          {title}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          {badge && (
            <div className="font-mono text-[9px] px-1.5 py-0.5 rounded-xs text-text-dim bg-bg-raised border border-border-dim">
              {badge}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-3.5">{children}</div>
    </div>
  );
}
