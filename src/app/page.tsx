import { Panel } from "@/components/Panel";
import { PipelineBadge } from "@/components/PipelineBadge";
import { TokenizerPanel } from "@/components/TokenizerPanel";

const PIPELINE_STEPS = ["입력", "토큰화", "시맨틱 분석", "태스크 추출", "실행"];

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      {/* TOP BAR */}
      <header className="h-[44px] flex items-center gap-5 px-5 shrink-0 z-10 bg-bg-panel border-b border-border">
        <div className="font-condensed text-[15px] font-bold tracking-[0.12em] uppercase text-accent">
          SWV{" "}
          <span className="font-normal text-text-sec">
            / Semantic Workflow Visualizer
          </span>
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="text-[11px] tracking-[0.06em] text-text-sec">
          PIPELINE v0.1.0
        </div>
        <div className="ml-auto flex items-center gap-3">
          <PipelineBadge variant="idle">GROQ API</PipelineBadge>
        </div>
      </header>

      {/* PIPELINE STATUS BAR */}
      <div className="h-[38px] flex items-center px-5 shrink-0 bg-bg-panel border-b border-border-dim">
        {PIPELINE_STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2 px-4 relative">
            {i < PIPELINE_STEPS.length - 1 && (
              <div className="absolute right-[-1px] top-1/2 -translate-y-1/2 w-[18px] h-px bg-border" />
            )}
            <div className="w-[6px] h-[6px] rounded-full bg-text-dim" />
            <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-text-dim">
              {step}
            </span>
          </div>
        ))}
        <div className="ml-auto font-mono text-[10px] text-text-sec">
          대기 중
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="flex-1 grid gap-px overflow-hidden bg-border-dim [grid-template-columns:340px_1fr_320px] [grid-template-rows:1fr_220px]">
        {/* COL 1, ROW 1 — Live Tokenizer */}
        <Panel title="Live Tokenizer" dotColor="#4faee8">
          <TokenizerPanel />
        </Panel>

        {/* COL 2, ROW 1 — AI Streaming */}
        <Panel
          title="AI 스트리밍 분석"
          dotColor="var(--accent)"
          badge="GROQ / llama-3.3-70b"
        >
          <Placeholder>분석 대기 중</Placeholder>
        </Panel>

        {/* COL 3, ROW 1 — Vector Space */}
        <Panel title="Vector Space" dotColor="var(--purple)" badge="코사인 유사도">
          <Placeholder>벡터 맵 대기 중</Placeholder>
        </Panel>

        {/* COL 1, ROW 2 — Prompt Log */}
        <Panel title="Prompt Log" dotColor="var(--blue)" badge="투명성 패널">
          <Placeholder>로그 없음</Placeholder>
        </Panel>

        {/* COL 2-3, ROW 2 — Task Execution */}
        <Panel
          title="Task Execution"
          dotColor="var(--amber)"
          badge="대기 중"
          className="col-span-2"
        >
          <Placeholder>태스크 없음</Placeholder>
        </Panel>
      </div>
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex items-center justify-center font-mono text-[11px] tracking-[0.06em] text-text-dim">
      — {children} —
    </div>
  );
}
