"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useWorkflowStore } from "@/store/workflowStore";
import { KNOWLEDGE_BASE, KnowledgeItem, computeSimilarities } from "@/lib/knowledge";

// 카테고리별 노드 색상 (globals.css의 CSS 변수와 동일한 값)
const CATEGORY_COLOR: Record<KnowledgeItem["category"], string> = {
  messaging: "#00d4a8",
  task:      "#f5a623",
  data:      "#4080f0",
  schedule:  "#8855ff",
};

// 이 값 미만의 유사도는 링크를 그리지 않음 (너무 약한 연관성 제거)
const LINK_THRESHOLD = 0.05;

// D3 시뮬레이션에서 사용하는 노드 타입.
// SimulationNodeDatum을 extends하면 D3가 x, y, vx, vy 등 물리 좌표를 자동으로 주입해 준다.
interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  isInput: boolean;         // true면 사용자 입력 노드, false면 지식베이스 노드
  category?: KnowledgeItem["category"];
  similarity: number;       // 입력 노드는 1, 지식베이스 노드는 코사인 유사도 (0~1)
}

// D3 링크 타입. source/target은 D3가 시뮬레이션 중에 노드 객체 참조로 교체한다.
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  similarity: number;
}

// 노드 색상: 입력 노드는 흰색 계열, 지식베이스 노드는 카테고리 색상
const getNodeColor = (d: SimNode) => d.isInput ? "#e2e8f4" : CATEGORY_COLOR[d.category!] ?? "#6b7fa3";
// 노드 반지름: 유사도가 높을수록 크게 (collide radius 계산에도 재사용)
const getNodeRadius = (d: SimNode) => d.isInput ? 10 : 7 + d.similarity * 10;
// 레이블 y 오프셋: 원 크기에 맞게 위로 올림
const getLabelOffset = (d: SimNode) => d.isInput ? -14 : -(8 + d.similarity * 10) - 4;

export function VectorMap() {
  const stage = useWorkflowStore((s) => s.stage);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  // tokenizing → analyzing 전환이 빠르게 일어날 때 이중 init을 막기 위한 플래그
  const initializedRef = useRef(false);

  useEffect(() => {
    const svg = svgRef.current;

    // idle 진입 = Reset. 다음 분석을 위해 상태 초기화
    if (stage === "idle") {
      initializedRef.current = false;
      simRef.current?.stop();
      return;
    }

    if (!svg) return;

    // tokenizing은 새 분석 사이클의 시작이므로 이전 플래그를 리셋한다.
    // done/error 상태에서 Reset 없이 재분석하는 경우도 여기서 처리된다.
    if (stage === "tokenizing") initializedRef.current = false;

    // 이미 이번 사이클에서 초기화 완료 → 시뮬레이션은 계속 실행 중이므로 스킵
    if (initializedRef.current) return;

    // 정상 경로: tokenizing에서 init
    // 폴백 경로: tokenizing에서 requestAnimationFrame을 예약했지만
    //           곧바로 analyzing으로 전환되며 RAF가 취소된 경우 analyzing에서 재시도
    if (stage !== "tokenizing" && stage !== "analyzing") return;

    let raf: number;

    const init = () => {
      // SVG가 아직 레이아웃 계산 전이라면 (width/height = 0) 다음 프레임에 재시도
      const { width, height } = svg.getBoundingClientRect();
      if (width === 0 || height === 0) {
        raf = requestAnimationFrame(init);
        return;
      }

      const cx = width / 2;
      const cy = height / 2;

      // 분석 버튼 클릭 시점의 input으로 유사도 계산
      // (getState()로 읽는 이유: useEffect 클로저에서 최신 값을 보장하기 위해)
      const input = useWorkflowStore.getState().input;
      const inputWords = input.toLowerCase().split(/[\s\W]+/).filter(Boolean);
      const similarities = computeSimilarities(inputWords, KNOWLEDGE_BASE);

      // ── 노드 데이터 구성 ────────────────────────────────────────────────────
      // 입력 노드 1개 + 지식베이스 노드 N개
      // 입력 노드의 초기 위치를 중앙(cx, cy)으로 고정해 시뮬레이션 안정화
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

      // ── 링크 데이터 구성 ────────────────────────────────────────────────────
      // 유사도가 임계값 이상인 항목만 입력 노드와 연결
      // map → filter → map 순서로 similarities 조회를 한 번만 수행
      const links: SimLink[] = KNOWLEDGE_BASE
        .map((item) => ({ item, similarity: similarities[item.id] ?? 0 }))
        .filter(({ similarity }) => similarity >= LINK_THRESHOLD)
        .map(({ item, similarity }) => ({ source: "__input__", target: item.id, similarity }));

      // ── SVG 초기화 및 요소 생성 ─────────────────────────────────────────────
      d3.select(svg).selectAll("*").remove();
      const g = d3.select(svg).append("g"); // 모든 요소를 담는 최상위 그룹

      // 링크(선): D3의 data().join() 패턴 = 데이터 배열 길이만큼 <line> 태그를 자동 생성
      // 유사도가 높을수록 선이 굵고 밝아짐
      const linkSel = g
        .append("g")
        .selectAll<SVGLineElement, SimLink>("line")
        .data(links)
        .join("line")
        .attr("stroke-width", (d) => Math.max(0.5, d.similarity * 4))
        .attr("stroke", (d) => (d.similarity > 0.15 ? "#00d4a8" : "#1e2d45"))
        .attr("stroke-opacity", (d) => 0.3 + d.similarity * 0.7);

      // 노드 그룹: 각 노드를 <g> 태그로 묶어 circle + text를 함께 이동시킴
      const nodeSel = g
        .append("g")
        .selectAll<SVGGElement, SimNode>("g")
        .data(nodes)
        .join("g")
        .style("cursor", "default");

      // 원: 유사도가 높을수록 크고 불투명하게 표시
      nodeSel
        .append("circle")
        .attr("r", getNodeRadius)
        .attr("fill", getNodeColor)
        .attr("fill-opacity", (d) => (d.isInput ? 1 : 0.25 + d.similarity * 0.75))
        .attr("stroke", getNodeColor)
        .attr("stroke-width", 1)
        .attr("stroke-opacity", (d) => (d.isInput ? 0.9 : 0.5 + d.similarity * 0.5));

      // 레이블: 원 위에 표시, 유사도가 높을수록 원이 커져 dy 오프셋도 크게 조정
      nodeSel
        .append("text")
        .text((d) => d.label)
        .attr("dy", getLabelOffset)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--font-jetbrains-mono), monospace")
        .attr("font-size", "9px")
        .attr("fill", getNodeColor)
        .attr("fill-opacity", (d) => (d.isInput ? 1 : 0.5 + d.similarity * 0.5));

      // ── Force Simulation (물리 기반 자동 배치) ──────────────────────────────
      // D3가 매 프레임 노드 위치를 계산하며 자연스럽게 퍼지는 애니메이션을 만든다.
      if (simRef.current) simRef.current.stop(); // 이전 시뮬레이션 정리

      simRef.current = d3
        .forceSimulation<SimNode>(nodes)
        .force("charge", d3.forceManyBody<SimNode>().strength(-80))  // 노드끼리 서로 밀어냄
        .force("center", d3.forceCenter(cx, cy))                      // 전체를 화면 중앙으로 당김
        .force(
          "link",
          d3
            .forceLink<SimNode, SimLink>(links)
            .id((d) => d.id)
            .strength((d) => d.similarity) // 유사도 높을수록 강하게 연결
            .distance(80)                  // 연결된 노드 사이 목표 거리
        )
        .force("collide", d3.forceCollide<SimNode>().radius((d) => getNodeRadius(d) + 15)) // 노드 크기에 따른 동적 충돌 반경
        .on("tick", () => {
          // 매 프레임 D3가 계산한 x, y 좌표를 SVG 요소에 반영
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

    // 시뮬레이션은 여기서 중단하지 않는다 — analyzing → done 단계에서도 계속 실행돼야 함.
    // 중단은 stage === "idle" 분기에서만 수행한다.
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [stage]);

  // 패널 크기 변화를 감지해 forceCenter를 즉시 업데이트하는 observer.
  // stage effect와 분리해야 stage 전환(tokenizing→analyzing→done) 시에도 끊기지 않는다.
  // restart 없이 forceCenter만 갱신 — 시뮬레이션이 warm하면 다음 tick에서 자동 반영.
  // 시뮬레이션이 완전히 멈춰있을 때만 alpha(0.15)로 살짝 재시동.
  useEffect(() => {
    const svg = svgRef.current;
    if (stage === "idle" || !svg) return;
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
