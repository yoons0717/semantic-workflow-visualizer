"use client";

import { useWorkflowStore } from "@/store/workflowStore";
import { CATEGORY_COLOR } from "@/lib/knowledge";
import { EmptyState } from "@/components/EmptyState";
import { useVectorSimulation, TooltipState } from "@/hooks/useVectorSimulation";

function NodeTooltip({ tooltip }: { tooltip: TooltipState }) {
  const { x, y, node } = tooltip;
  return (
    <div
      className="absolute z-10 pointer-events-none px-2.5 py-2 rounded-[3px] bg-bg-raised border border-border flex flex-col gap-1 min-w-36 max-w-48"
      style={{ left: x + 12, top: y - 8 }}
    >
      <div className="font-mono text-[10px] font-semibold text-text-pri leading-none">
        {node.label}
      </div>
      {node.category && (
        <span
          className="font-mono text-[8px] uppercase tracking-[0.06em] px-1 py-0.5 rounded-xs border w-fit"
          style={{
            color: CATEGORY_COLOR[node.category],
            borderColor: `${CATEGORY_COLOR[node.category]}40`,
          }}
        >
          {node.category}
        </span>
      )}
      <div className="font-mono text-[9px] text-text-dim">
        similarity:{" "}
        <span className="text-accent">{node.similarity.toFixed(3)}</span>
      </div>
      {node.description && (
        <div className="text-[9px] text-text-sec leading-[1.5] border-t border-border-dim pt-1 mt-0.5">
          {node.description}
        </div>
      )}
    </div>
  );
}

export function VectorMap() {
  const stage        = useWorkflowStore((s) => s.stage);
  const similarities = useWorkflowStore((s) => s.similarities);
  const { containerRef, svgRef, tooltip } = useVectorSimulation(stage, similarities);

  if (stage === "idle" || stage === "error") {
    return <EmptyState>— Activate after starting analysis —</EmptyState>;
  }

  return (
    <div ref={containerRef} className="h-full w-full relative">
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      {tooltip && <NodeTooltip tooltip={tooltip} />}
    </div>
  );
}
