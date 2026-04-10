"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useWorkflowStore } from "@/store/workflowStore";
import { KNOWLEDGE_BASE, KnowledgeItem, computeSimilarities } from "@/lib/knowledge";

const CATEGORY_COLOR: Record<KnowledgeItem["category"], string> = {
  messaging: "#00d4a8",
  task:      "#f5a623",
  data:      "#4080f0",
  schedule:  "#8855ff",
};

const LINK_THRESHOLD = 0.05;

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  isInput: boolean;
  category?: KnowledgeItem["category"];
  similarity: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  similarity: number;
}

function getNodeColor(d: SimNode): string {
  return d.isInput ? "#e2e8f4" : CATEGORY_COLOR[d.category!] ?? "#6b7fa3";
}

export function VectorMap() {
  const stage = useWorkflowStore((s) => s.stage);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  // Prevents double-init when tokenizing → analyzing transitions rapidly.
  const initializedRef = useRef(false);

  useEffect(() => {
    const svg = svgRef.current;

    if (stage === "idle") {
      initializedRef.current = false;
      simRef.current?.stop();
      return;
    }

    if (!svg) return;

    // tokenizing = new analysis cycle; reset so init runs fresh.
    if (stage === "tokenizing") initializedRef.current = false;

    // Already initialized this cycle — simulation keeps running.
    if (initializedRef.current) return;

    // Init on tokenizing (normal path) or analyzing (fallback when
    // tokenizing's RAF was cancelled before the SVG had dimensions).
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

      const input = useWorkflowStore.getState().input;
      const inputWords = input.toLowerCase().split(/[\s\W]+/).filter(Boolean);
      const similarities = computeSimilarities(inputWords, KNOWLEDGE_BASE);

      const nodes: SimNode[] = [
        { id: "__input__", label: "Input", isInput: true, similarity: 1, x: cx, y: cy },
        ...KNOWLEDGE_BASE.map((item) => ({
          id: item.id,
          label: item.label,
          isInput: false,
          category: item.category,
          similarity: similarities[item.id] ?? 0,
        })),
      ];

      const links: SimLink[] = KNOWLEDGE_BASE
        .map((item) => ({ item, similarity: similarities[item.id] ?? 0 }))
        .filter(({ similarity }) => similarity >= LINK_THRESHOLD)
        .map(({ item, similarity }) => ({ source: "__input__", target: item.id, similarity }));

      d3.select(svg).selectAll("*").remove();
      const g = d3.select(svg).append("g");

      const linkSel = g
        .append("g")
        .selectAll<SVGLineElement, SimLink>("line")
        .data(links)
        .join("line")
        .attr("stroke-width", (d) => Math.max(0.5, d.similarity * 4))
        .attr("stroke", (d) => (d.similarity > 0.15 ? "#00d4a8" : "#1e2d45"))
        .attr("stroke-opacity", (d) => 0.3 + d.similarity * 0.7);

      const nodeSel = g
        .append("g")
        .selectAll<SVGGElement, SimNode>("g")
        .data(nodes)
        .join("g")
        .style("cursor", "default");

      nodeSel
        .append("circle")
        .attr("r", (d) => (d.isInput ? 10 : 7 + d.similarity * 10))
        .attr("fill", getNodeColor)
        .attr("fill-opacity", (d) => (d.isInput ? 1 : 0.25 + d.similarity * 0.75))
        .attr("stroke", getNodeColor)
        .attr("stroke-width", 1)
        .attr("stroke-opacity", (d) => (d.isInput ? 0.9 : 0.5 + d.similarity * 0.5));

      nodeSel
        .append("text")
        .text((d) => d.label)
        .attr("dy", (d) => (d.isInput ? -14 : -(8 + d.similarity * 10) - 4))
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--font-jetbrains-mono), monospace")
        .attr("font-size", "9px")
        .attr("fill", getNodeColor)
        .attr("fill-opacity", (d) => (d.isInput ? 1 : 0.5 + d.similarity * 0.5));

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
        .force("collide", d3.forceCollide<SimNode>().radius(24))
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

    // Simulation is NOT stopped here — it must keep running through
    // analyzing → done. Stop only happens in the idle branch above.
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  if (stage === "idle") {
    return (
      <div className="h-full flex items-center justify-center font-mono text-[11px] tracking-[0.06em] text-text-dim">
        — Activate after starting analysis —
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
