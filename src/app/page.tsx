import { PipelineBadge } from "@/components/PipelineBadge";
import { PipelineStatus } from "@/components/PipelineStatus";
import { ResizableLayout } from "@/components/ResizableLayout";

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      {/* TOP BAR */}
      <header className="h-11 flex items-center gap-3 md:gap-5 px-4 md:px-5 shrink-0 z-10 bg-bg-panel border-b border-border">
        <div className="font-condensed text-[15px] font-bold tracking-[0.12em] uppercase text-accent shrink-0">
          SWV
          <span className="font-normal text-text-sec hidden sm:inline">
            {" "}/ Semantic Workflow Visualizer
          </span>
        </div>
        <div className="w-px h-5 bg-border shrink-0 hidden sm:block" />
        <div className="text-[11px] tracking-[0.06em] text-text-sec shrink-0 hidden sm:block">
          PIPELINE v0.1.0
        </div>
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <PipelineBadge variant="idle">GEMINI API</PipelineBadge>
        </div>
      </header>

      {/* PIPELINE STATUS BAR */}
      <PipelineStatus />

      {/* RESIZABLE GRID */}
      <ResizableLayout />
    </div>
  );
}
