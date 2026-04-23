"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useWorkflowStore } from "@/store/workflowStore";
import { KNOWLEDGE_BASE, KnowledgeItem, CATEGORY_COLOR } from "@/lib/knowledge";
import type { PipelineStage } from "@/types";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  isInput: boolean;
  category?: KnowledgeItem["category"];
  similarity: number;
  description?: string;
}

export interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  similarity: number;
}

export interface TooltipState {
  x: number;
  y: number;
  node: SimNode;
}

// ── 상수 ──────────────────────────────────────────────────────────────────────

const LINK_THRESHOLD = 0.05;
const FALLBACK_SIMILARITY = 0.1;

// ── 시각 속성 헬퍼 ───────────────────────────────────────────────────────────

export const getNodeColor = (d: SimNode) =>
  d.isInput ? "#e2e8f4" : (CATEGORY_COLOR[d.category!] ?? "#6b7fa3");
export const getNodeRadius = (d: SimNode) =>
  d.isInput ? 10 : 7 + d.similarity * 10;
export const getNodeFillOpacity = (d: SimNode) =>
  d.isInput ? 1 : 0.25 + d.similarity * 0.75;
export const getNodeStrokeOpacity = (d: SimNode) =>
  d.isInput ? 0.9 : 0.5 + d.similarity * 0.5;
export const getLabelOffset = (d: SimNode) =>
  d.isInput ? -14 : -(12 + d.similarity * 10);

export const getLinkStrokeWidth = (d: SimLink) =>
  Math.max(0.5, d.similarity * 4);
export const getLinkStroke = (d: SimLink) =>
  d.similarity > 0.15 ? "#00d4a8" : "#1e2d45";
export const getLinkStrokeOpacity = (d: SimLink) =>
  d.similarity >= LINK_THRESHOLD ? 0.3 + d.similarity * 0.7 : 0;

// ── 데이터 빌더 ──────────────────────────────────────────────────────────────

export function buildSimData(
  cx: number,
  cy: number,
  sims: Record<string, number>,
) {
  const hasSims = Object.keys(sims).length > 0;
  const getSim = (id: string) =>
    hasSims ? (sims[id] ?? 0) : FALLBACK_SIMILARITY;

  const nodes: SimNode[] = [
    {
      id: "__input__",
      label: "Input",
      isInput: true,
      similarity: 1,
      x: cx,
      y: cy,
    },
    ...KNOWLEDGE_BASE.map((item) => ({
      id: item.id,
      label: item.label,
      isInput: false,
      category: item.category,
      similarity: getSim(item.id),
      description: item.description,
    })),
  ];
  const links: SimLink[] = KNOWLEDGE_BASE.map((item) => ({
    source: "__input__",
    target: item.id,
    similarity: getSim(item.id),
  }));

  return { nodes, links };
}

// ── 훅 ───────────────────────────────────────────────────────────────────────

export function useVectorSimulation(
  stage: PipelineStage,
  similarities: Record<string, number>,
) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const initializedRef = useRef(false);
  const nodeSelRef = useRef<d3.Selection<
    SVGGElement,
    SimNode,
    SVGGElement,
    unknown
  > | null>(null);
  const linkSelRef = useRef<d3.Selection<
    SVGLineElement,
    SimLink,
    SVGGElement,
    unknown
  > | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);

  // ── 시뮬레이션 초기화 ────────────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;

    if (stage === "idle" || stage === "error") {
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
      const { nodes, links } = buildSimData(
        cx,
        cy,
        useWorkflowStore.getState().similarities,
      );

      nodesRef.current = nodes;
      linksRef.current = links;

      const svgSel = d3.select(svg);
      svgSel.selectAll("*").remove();
      const g = svgSel.append("g");

      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on("zoom", ({ transform }) =>
          g.attr("transform", transform.toString()),
        );
      svgSel.call(zoom);
      svgSel.on("dblclick.zoom", () =>
        svgSel.transition().duration(300).call(zoom.transform, d3.zoomIdentity),
      );

      const linkSel = g
        .append("g")
        .selectAll<SVGLineElement, SimLink>("line")
        .data(links)
        .join("line")
        .attr("stroke-width", getLinkStrokeWidth)
        .attr("stroke", getLinkStroke)
        .attr("stroke-opacity", getLinkStrokeOpacity);

      const handleHover = (event: PointerEvent, d: SimNode) => {
        if (d.isInput) return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          node: d,
        });
      };

      const nodeSel = g
        .append("g")
        .selectAll<SVGGElement, SimNode>("g")
        .data(nodes)
        .join("g")
        .on("pointerenter", handleHover)
        .on("pointermove", handleHover)
        .on("pointerleave", () => setTooltip(null));

      nodeSel
        .append("circle")
        .attr("r", getNodeRadius)
        .attr("fill", getNodeColor)
        .attr("fill-opacity", getNodeFillOpacity)
        .attr("stroke", getNodeColor)
        .attr("stroke-width", 1)
        .attr("stroke-opacity", getNodeStrokeOpacity);

      nodeSel
        .append("text")
        .text((d) => d.label)
        .attr("dy", getLabelOffset)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--font-mono)")
        .attr("font-size", "9px")
        .attr("fill", getNodeColor)
        .attr("fill-opacity", getNodeStrokeOpacity);

      linkSelRef.current = linkSel;
      nodeSelRef.current = nodeSel;

      simRef.current?.stop();
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
            .distance(80),
        )
        .force(
          "collide",
          d3.forceCollide<SimNode>().radius((d) => getNodeRadius(d) + 15),
        )
        .on("tick", () => {
          linkSel
            .attr("x1", (d) => (d.source as SimNode).x ?? 0)
            .attr("y1", (d) => (d.source as SimNode).y ?? 0)
            .attr("x2", (d) => (d.target as SimNode).x ?? 0)
            .attr("y2", (d) => (d.target as SimNode).y ?? 0);
          nodeSel.attr(
            "transform",
            (d) => `translate(${d.x ?? 0},${d.y ?? 0})`,
          );
        });

      initializedRef.current = true;
    };

    init();
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  // ── similarities 업데이트 ───────────────────────────────────────────────
  useEffect(() => {
    if (Object.keys(similarities).length === 0) return;
    if (!simRef.current || !nodeSelRef.current || !linkSelRef.current) return;

    nodesRef.current.forEach((node) => {
      if (!node.isInput) node.similarity = similarities[node.id] ?? 0;
    });
    linksRef.current.forEach((link) => {
      const targetId =
        typeof link.target === "object"
          ? (link.target as SimNode).id
          : (link.target as string);
      link.similarity = similarities[targetId] ?? 0;
    });

    nodeSelRef.current
      .select("circle")
      .transition()
      .duration(600)
      .attr("r", getNodeRadius)
      .attr("fill-opacity", getNodeFillOpacity)
      .attr("stroke-opacity", getNodeStrokeOpacity);

    nodeSelRef.current
      .select("text")
      .transition()
      .duration(600)
      .attr("dy", getLabelOffset)
      .attr("fill-opacity", getNodeStrokeOpacity);

    linkSelRef.current
      .transition()
      .duration(600)
      .attr("stroke-width", getLinkStrokeWidth)
      .attr("stroke", getLinkStroke)
      .attr("stroke-opacity", getLinkStrokeOpacity);

    simRef.current.alpha(0.4).restart();
  }, [similarities]);

  return { containerRef, svgRef, tooltip };
}
