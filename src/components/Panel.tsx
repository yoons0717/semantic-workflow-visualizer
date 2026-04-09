"use client";

interface PanelProps {
  title: string;
  dotColor: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}

export function Panel({ title, dotColor, badge, children, className = "" }: PanelProps) {
  return (
    <div
      className={`flex flex-col overflow-hidden ${className}`}
      style={{ background: "var(--bg-panel)" }}
    >
      <div
        className="h-[36px] px-4 flex items-center gap-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border-dim)" }}
      >
        <div
          className="w-[5px] h-[5px] rounded-full shrink-0"
          style={{ background: dotColor }}
        />
        <span
          className="text-[11px] font-semibold tracking-[0.14em] uppercase"
          style={{
            fontFamily: "var(--font-barlow-condensed), sans-serif",
            color: "var(--text-sec)",
          }}
        >
          {title}
        </span>
        {badge && (
          <div
            className="ml-auto text-[9px] px-[6px] py-[2px] rounded-[2px]"
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              color: "var(--text-dim)",
              background: "var(--bg-raised)",
              border: "1px solid var(--border-dim)",
            }}
          >
            {badge}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden p-[14px]">{children}</div>
    </div>
  );
}
