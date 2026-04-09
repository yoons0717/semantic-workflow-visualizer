"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useWorkflowStore } from "@/store/workflowStore";
import {
  KNOWLEDGE_BASE,
  KnowledgeItem,
  computeSimilarities,
} from "@/lib/knowledge";

// 카테고리별 색상 (globals.css CSS 변수와 대응)
const CATEGORY_COLOR: Record<KnowledgeItem["category"], string> = {
  messaging: "#00d4a8", // accent
  task:      "#f5a623", // amber
  data:      "#4080f0", // blue
  schedule:  "#8855ff", // purple
};

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  isInput: boolean;
  category?: KnowledgeItem["category"];
  similarity: number; // 입력 노드는 1, 나머지는 computeSimilarities 결과
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  similarity: number;
}

export function VectorMap() {
  const tokens = useWorkflowStore((s) => s.tokens);
  const stage = useWorkflowStore((s) => s.stage);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const { width, height } = svg.getBoundingClientRect();
    const cx = width / 2;
    const cy = height / 2;

    // 유사도 계산 (토큰 텍스트 기반 Jaccard)
    const tokenTexts = tokens.map((t) => t.text);
    const similarities = computeSimilarities(tokenTexts, KNOWLEDGE_BASE);

    // 노드 구성
    const nodes: SimNode[] = [
      {
        id: "__input__",
        label: "입력",
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
        similarity: similarities[item.id] ?? 0,
      })),
    ];

    // 유사도 0.05 이상인 항목만 링크 생성
    const LINK_THRESHOLD = 0.05;
    const links: SimLink[] = KNOWLEDGE_BASE
      .filter((item) => (similarities[item.id] ?? 0) >= LINK_THRESHOLD)
      .map((item) => ({
        source: "__input__",
        target: item.id,
        similarity: similarities[item.id] ?? 0,
      }));

    // SVG 초기화
    d3.select(svg).selectAll("*").remove();

    const g = d3.select(svg).append("g");

    // 링크
    const linkSel = g
      .append("g")
      .selectAll<SVGLineElement, SimLink>("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d) => Math.max(0.5, d.similarity * 4))
      .attr("stroke", (d) =>
        d.similarity > 0.15 ? "#00d4a8" : "#1e2d45"
      )
      .attr("stroke-opacity", (d) => 0.3 + d.similarity * 0.7);

    // 노드 그룹
    const nodeSel = g
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g")
      .style("cursor", "default");

    // 원
    nodeSel
      .append("circle")
      .attr("r", (d) => {
        if (d.isInput) return 10;
        return 7 + d.similarity * 10;
      })
      .attr("fill", (d) => {
        if (d.isInput) return "#e2e8f4";
        return CATEGORY_COLOR[d.category!] ?? "#6b7fa3";
      })
      .attr("fill-opacity", (d) => (d.isInput ? 1 : 0.25 + d.similarity * 0.75))
      .attr("stroke", (d) => {
        if (d.isInput) return "#e2e8f4";
        return CATEGORY_COLOR[d.category!] ?? "#6b7fa3";
      })
      .attr("stroke-width", 1)
      .attr("stroke-opacity", (d) => (d.isInput ? 0.9 : 0.5 + d.similarity * 0.5));

    // 레이블
    nodeSel
      .append("text")
      .text((d) => d.label)
      .attr("dy", (d) => (d.isInput ? -14 : -(8 + d.similarity * 10) - 4))
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--font-jetbrains-mono), monospace")
      .attr("font-size", "9px")
      .attr("fill", (d) => {
        if (d.isInput) return "#e2e8f4";
        return CATEGORY_COLOR[d.category!] ?? "#6b7fa3";
      })
      .attr("fill-opacity", (d) => (d.isInput ? 1 : 0.5 + d.similarity * 0.5));

    // Force simulation
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

        nodeSel.attr(
          "transform",
          (d) => `translate(${d.x ?? 0},${d.y ?? 0})`
        );
      });

    return () => {
      simRef.current?.stop();
    };
  }, [tokens]);

  if (stage === "idle") {
    return (
      <div className="h-full flex items-center justify-center font-mono text-[11px] tracking-[0.06em] text-text-dim">
        — 분석 시작 후 활성화 —
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
