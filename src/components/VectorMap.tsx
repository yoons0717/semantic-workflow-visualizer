"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useWorkflowStore } from "@/store/workflowStore";
import { KNOWLEDGE_BASE, KnowledgeItem, computeSimilarities } from "@/lib/knowledge";
import { EmptyState } from "@/components/EmptyState";

const CATEGORY_COLOR: Record<KnowledgeItem["category"], string> = {
  messaging: "#00d4a8",
  task:      "#f5a623",
  data:      "#4080f0",
  schedule:  "#8855ff",
};

// similarity < LINK_THRESHOLD인 연결은 시각적으로 의미가 없어 제거
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

const getNodeColor  = (d: SimNode) => d.isInput ? "#e2e8f4" : CATEGORY_COLOR[d.category!] ?? "#6b7fa3";
const getNodeRadius = (d: SimNode) => d.isInput ? 10 : 7 + d.similarity * 10;
// 원이 클수록 레이블을 더 위로 띄워야 겹치지 않음
const getLabelOffset = (d: SimNode) => d.isInput ? -14 : -(12 + d.similarity * 10);

export function VectorMap() {
  const stage = useWorkflowStore((s) => s.stage);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  // tokenizing → analyzing 전환이 빠르게 일어날 때 이중 init을 막기 위한 플래그
  const initializedRef = useRef(false);

  useEffect(() => {
    const svg = svgRef.current;

    if (stage === "idle") {
      initializedRef.current = false;
      simRef.current?.stop();
      return;
    }

    if (!svg) return;

    // done/error에서 Reset 없이 재분석하는 경우도 여기서 플래그를 리셋
    if (stage === "tokenizing") initializedRef.current = false;

    if (initializedRef.current) return;

    // 정상 경로: tokenizing에서 init
    // 폴백 경로: tokenizing의 RAF가 취소된 채 analyzing으로 전환된 경우 여기서 재시도
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

      // getState()로 읽는 이유: useEffect 클로저에서 최신 input을 보장하기 위해
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
        .attr("stroke-opacity", (d) => 0.3 + d.similarity * 0.7);

      const nodeSel = g
        .append("g")
        .selectAll<SVGGElement, SimNode>("g")
        .data(nodes)
        .join("g");

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

    // 시뮬레이션은 여기서 중단하지 않음 — analyzing → done에서도 계속 실행돼야 함
    // 중단은 stage === "idle" 분기에서만
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [stage]);

  // stage effect와 분리된 이유: stage 전환(tokenizing→analyzing→done) 중에도 끊기지 않게
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => {
      const sim = simRef.current;
      if (!sim) return;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;
      sim.force("center", d3.forceCenter(width / 2, height / 2));
      // 시뮬레이션이 완전히 멈췄을 때만 재시동 (warm하면 다음 tick에 자동 반영)
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
    <div className="h-full w-full relative">
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
}
