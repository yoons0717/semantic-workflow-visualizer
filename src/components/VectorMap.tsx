"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useWorkflowStore } from "@/store/workflowStore";
import { KNOWLEDGE_BASE, KnowledgeItem } from "@/lib/knowledge";
import { EmptyState } from "@/components/EmptyState";

const CATEGORY_COLOR: Record<KnowledgeItem["category"], string> = {
  messaging: "#00d4a8",
  task:      "#f5a623",
  data:      "#4080f0",
  schedule:  "#8855ff",
};

// similarity < LINK_THRESHOLD인 링크는 투명 처리
const LINK_THRESHOLD = 0.05;
// Jina API 없을 때 노드에 적용하는 기본 유사도
const FALLBACK_SIMILARITY = 0.1;

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  isInput: boolean;
  category?: KnowledgeItem["category"];
  similarity: number;
  description?: string;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  similarity: number;
}

interface TooltipState {
  x: number;
  y: number;
  node: SimNode;
}

const getNodeColor   = (d: SimNode) => d.isInput ? "#e2e8f4" : CATEGORY_COLOR[d.category!] ?? "#6b7fa3";
const getNodeRadius  = (d: SimNode) => d.isInput ? 10 : 7 + d.similarity * 10;
const getLabelOffset = (d: SimNode) => d.isInput ? -14 : -(12 + d.similarity * 10);

export function VectorMap() {
  const stage = useWorkflowStore((s) => s.stage);
  const similarities = useWorkflowStore((s) => s.similarities);

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const initializedRef = useRef(false);
  // 업데이트 effect에서 D3 selection을 조작하기 위한 refs
  const nodeSelRef = useRef<d3.Selection<SVGGElement, SimNode, SVGGElement, unknown> | null>(null);
  const linkSelRef = useRef<d3.Selection<SVGLineElement, SimLink, SVGGElement, unknown> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);

  // ── 시뮬레이션 초기화 ──────────────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;

    if (stage === "idle") {
      initializedRef.current = false;
      simRef.current?.stop();
      return;
    }

    if (!svg) return;

    if (stage === "tokenizing") initializedRef.current = false;

    if (initializedRef.current) return;
    if (stage !== "tokenizing" && stage !== "analyzing") return;

    let raf: number;

    const init = () => {
      const { width, height } = svg.getBoundingClientRect();
      if (width === 0 || height === 0) {
        raf = requestAnimationFrame(init);
        return;
      }

      const cx = width / 2;
      const cy = height / 2;

      // 초기엔 fallback 유사도로 렌더링 — similarities 도착 시 update effect에서 갱신
      const currentSims = useWorkflowStore.getState().similarities;
      const getSim = (id: string) =>
        Object.keys(currentSims).length > 0
          ? (currentSims[id] ?? 0)
          : FALLBACK_SIMILARITY;

      const nodes: SimNode[] = [
        { id: "__input__", label: "Input", isInput: true, similarity: 1, x: cx, y: cy },
        ...KNOWLEDGE_BASE.map((item) => ({
          id: item.id,
          label: item.label,
          isInput: false,
          category: item.category,
          similarity: getSim(item.id),
          description: item.description,
        })),
      ];

      // 모든 링크 생성 (threshold 제외) — 유사도 낮은 링크는 opacity로 숨김
      const links: SimLink[] = KNOWLEDGE_BASE.map((item) => ({
        source: "__input__",
        target: item.id,
        similarity: getSim(item.id),
      }));

      nodesRef.current = nodes;
      linksRef.current = links;

      const svgSel = d3.select(svg);
      svgSel.selectAll("*").remove();
      const g = svgSel.append("g");

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on("zoom", ({ transform }) => {
          g.attr("transform", transform.toString());
        });
      svgSel.call(zoom);
      svgSel.on("dblclick.zoom", () => {
        svgSel.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
      });

      const linkSel = g
        .append("g")
        .selectAll<SVGLineElement, SimLink>("line")
        .data(links)
        .join("line")
        .attr("stroke-width", (d) => Math.max(0.5, d.similarity * 4))
        .attr("stroke", (d) => (d.similarity > 0.15 ? "#00d4a8" : "#1e2d45"))
        .attr("stroke-opacity", (d) => d.similarity >= LINK_THRESHOLD ? 0.3 + d.similarity * 0.7 : 0);

      const nodeSel = g
        .append("g")
        .selectAll<SVGGElement, SimNode>("g")
        .data(nodes)
        .join("g")
        .on("pointerenter", (event: PointerEvent, d: SimNode) => {
          if (d.isInput) return;
          const container = containerRef.current;
          if (!container) return;
          const rect = container.getBoundingClientRect();
          setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, node: d });
        })
        .on("pointermove", (event: PointerEvent, d: SimNode) => {
          if (d.isInput) return;
          const container = containerRef.current;
          if (!container) return;
          const rect = container.getBoundingClientRect();
          setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, node: d });
        })
        .on("pointerleave", () => {
          setTooltip(null);
        });

      nodeSel
        .append("circle")
        .attr("r", getNodeRadius)
        .attr("fill", getNodeColor)
        .attr("fill-opacity", (d) => (d.isInput ? 1 : 0.25 + d.similarity * 0.75))
        .attr("stroke", getNodeColor)
        .attr("stroke-width", 1)
        .attr("stroke-opacity", (d) => (d.isInput ? 0.9 : 0.5 + d.similarity * 0.5));

      nodeSel
        .append("text")
        .text((d) => d.label)
        .attr("dy", getLabelOffset)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--font-mono)")
        .attr("font-size", "9px")
        .attr("fill", getNodeColor)
        .attr("fill-opacity", (d) => (d.isInput ? 1 : 0.5 + d.similarity * 0.5));

      linkSelRef.current = linkSel;
      nodeSelRef.current = nodeSel;

      if (simRef.current) simRef.current.stop();

      simRef.current = d3
        .forceSimulation<SimNode>(nodes)
        .force("charge", d3.forceManyBody<SimNode>().strength(-80))
        .force("center", d3.forceCenter(cx, cy))
        .force(
          "link",
          d3
            .forceLink<SimNode, SimLink>(links)
            .id((d) => d.id)
            .strength((d) => d.similarity)
            .distance(80)
        )
        .force("collide", d3.forceCollide<SimNode>().radius((d) => getNodeRadius(d) + 15))
        .on("tick", () => {
          linkSel
            .attr("x1", (d) => (d.source as SimNode).x ?? 0)
            .attr("y1", (d) => (d.source as SimNode).y ?? 0)
            .attr("x2", (d) => (d.target as SimNode).x ?? 0)
            .attr("y2", (d) => (d.target as SimNode).y ?? 0);
          nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
        });

      initializedRef.current = true;
    };

    init();

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [stage]);

  // ── similarities 업데이트 — Jina 결과 도착 시 노드/링크 시각 속성 갱신 ──────
  useEffect(() => {
    if (Object.keys(similarities).length === 0) return;
    if (!simRef.current || !nodeSelRef.current || !linkSelRef.current) return;

    // 노드/링크 데이터 in-place 업데이트 → forceLink strength 함수가 다음 tick에 반영
    nodesRef.current.forEach((node) => {
      if (!node.isInput) {
        node.similarity = similarities[node.id] ?? 0;
      }
    });
    linksRef.current.forEach((link) => {
      const targetId = typeof link.target === "object"
        ? (link.target as SimNode).id
        : (link.target as string);
      link.similarity = similarities[targetId] ?? 0;
    });

    // 시각 속성 transition 업데이트
    nodeSelRef.current
      .select("circle")
      .transition().duration(600)
      .attr("r", getNodeRadius)
      .attr("fill-opacity", (d) => (d.isInput ? 1 : 0.25 + d.similarity * 0.75))
      .attr("stroke-opacity", (d) => (d.isInput ? 0.9 : 0.5 + d.similarity * 0.5));

    nodeSelRef.current
      .select("text")
      .transition().duration(600)
      .attr("dy", getLabelOffset)
      .attr("fill-opacity", (d) => (d.isInput ? 1 : 0.5 + d.similarity * 0.5));

    linkSelRef.current
      .transition().duration(600)
      .attr("stroke-width", (d) => Math.max(0.5, d.similarity * 4))
      .attr("stroke", (d) => (d.similarity > 0.15 ? "#00d4a8" : "#1e2d45"))
      .attr("stroke-opacity", (d) =>
        d.similarity >= LINK_THRESHOLD ? 0.3 + d.similarity * 0.7 : 0
      );

    // 물리 시뮬레이션 gentle restart — 새 유사도 기반으로 재정렬
    simRef.current.alpha(0.4).restart();
  }, [similarities]);

  // ── resize 감지 ────────────────────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => {
      const sim = simRef.current;
      if (!sim) return;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;
      sim.force("center", d3.forceCenter(width / 2, height / 2));
      if (sim.alpha() <= sim.alphaMin()) {
        sim.alpha(0.15).restart();
      }
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, [stage]);

  if (stage === "idle") {
    return <EmptyState>— Activate after starting analysis —</EmptyState>;
  }

  return (
    <div ref={containerRef} className="h-full w-full relative">
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none px-2.5 py-2 rounded-[3px] bg-bg-raised border border-border flex flex-col gap-1 min-w-36 max-w-48"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <div className="font-mono text-[10px] font-semibold text-text-pri leading-none">
            {tooltip.node.label}
          </div>
          {tooltip.node.category && (
            <span
              className="font-mono text-[8px] uppercase tracking-[0.06em] px-1 py-0.5 rounded-xs border w-fit"
              style={{
                color: CATEGORY_COLOR[tooltip.node.category],
                borderColor: `${CATEGORY_COLOR[tooltip.node.category]}40`,
              }}
            >
              {tooltip.node.category}
            </span>
          )}
          <div className="font-mono text-[9px] text-text-dim">
            similarity:{" "}
            <span className="text-accent">{tooltip.node.similarity.toFixed(3)}</span>
          </div>
          {tooltip.node.description && (
            <div className="text-[9px] text-text-sec leading-[1.5] border-t border-border-dim pt-1 mt-0.5">
              {tooltip.node.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
