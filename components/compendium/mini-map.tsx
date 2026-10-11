"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useRouter } from "next/navigation";
import { PostGraph } from "@/lib/compendium";

interface MiniMapProps {
    graph: PostGraph;
    currentTitle: string;
}

interface SimNode extends d3.SimulationNodeDatum {
    id: string;
    label: string;
    type: "current" | "post" | "domain";
    url?: string;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
    source: string | SimNode;
    target: string | SimNode;
    type: "domain" | "mention";
}

export default function MiniMap({ graph }: MiniMapProps) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const router = useRouter();
    const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);

    useEffect(() => {
        if (!svgRef.current || !graph || graph.nodes.length === 0) return;

        const width = 280;
        const height = 200;
        const cx = width / 2;
        const cy = height / 2;
        const nodeCount = graph.nodes.length;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        svg.attr("viewBox", `0 0 ${width} ${height}`)
            .attr("width", "100%")
            .attr("height", "100%");

        // Deep clone data to avoid simulation mutation bugs
        const nodes: SimNode[] = graph.nodes.map((n) => ({ ...n }));
        const links: SimLink[] = graph.links.map((l) => ({ ...l }));

        // Dynamic initial positioning seed based on node count to fill ~75% of the minimap
        if (nodeCount === 1) {
            nodes[0].x = cx;
            nodes[0].y = cy;
        } else if (nodeCount === 2) {
            // Elegant diagonal span filling ~75% canvas width and balanced height
            nodes[0].x = cx - 72;
            nodes[0].y = cy - 26;
            nodes[1].x = cx + 72;
            nodes[1].y = cy + 26;
        } else if (nodeCount === 3) {
            nodes[0].x = cx;
            nodes[0].y = cy - 42;
            nodes[1].x = cx - 72;
            nodes[1].y = cy + 38;
            nodes[2].x = cx + 72;
            nodes[2].y = cy + 38;
        } else if (nodeCount === 4) {
            nodes[0].x = cx;
            nodes[0].y = cy - 44;
            nodes[1].x = cx - 76;
            nodes[1].y = cy + 12;
            nodes[2].x = cx + 76;
            nodes[2].y = cy + 12;
            nodes[3].x = cx;
            nodes[3].y = cy + 48;
        } else {
            const rx = Math.min(88, 55 + nodeCount * 3);
            const ry = Math.min(58, 38 + nodeCount * 2);
            nodes.forEach((node, idx) => {
                if (node.type === "current") {
                    node.x = cx;
                    node.y = cy;
                } else {
                    const angle = ((idx - 1) / (nodeCount - 1)) * 2 * Math.PI - Math.PI / 2;
                    node.x = cx + rx * Math.cos(angle);
                    node.y = cy + ry * Math.sin(angle);
                }
            });
        }

        // Dynamic force parameters calibrated for graph density
        const dynamicDistance =
            nodeCount <= 2 ? 148 : nodeCount <= 3 ? 115 : nodeCount <= 4 ? 92 : Math.max(45, 80 - nodeCount * 2.5);
        const dynamicCharge =
            nodeCount <= 2 ? -280 : nodeCount <= 3 ? -200 : nodeCount <= 4 ? -160 : Math.max(-140, -110 - nodeCount * 4);
        const dynamicCollision =
            nodeCount <= 2 ? 28 : nodeCount <= 4 ? 22 : Math.max(16, 24 - nodeCount * 0.7);

        const g = svg.append("g");

        // Force Simulation - runs to equilibrium and stops (no pan drift or drag collisions)
        const simulation = d3
            .forceSimulation<SimNode>(nodes)
            .force(
                "link",
                d3
                    .forceLink<SimNode, SimLink>(links)
                    .id((d) => d.id)
                    .distance(dynamicDistance)
            )
            .force("charge", d3.forceManyBody().strength(dynamicCharge));

        if (nodeCount <= 2) {
            simulation
                .force("x", d3.forceX<SimNode>((d) => (d.id === nodes[0].id ? cx - 72 : cx + 72)).strength(0.18))
                .force("y", d3.forceY<SimNode>((d) => (d.id === nodes[0].id ? cy - 26 : cy + 26)).strength(0.18));
        } else {
            simulation.force("center", d3.forceCenter(cx, cy).strength(0.8));
        }

        simulation.force("collision", d3.forceCollide().radius(dynamicCollision));

        // Pre-warm so initial render fills canvas immediately without chaotic springing
        simulation.tick(40);

        // Links: Subtle, understated neutral slate lines
        const link = g
            .append("g")
            .attr("stroke-opacity", 0.4)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke", "#475569")
            .attr("stroke-width", 1)
            .style("transition", "stroke 0.2s ease, stroke-opacity 0.2s ease, stroke-width 0.2s ease");

        // Nodes: Clean, minimalist nodes without color coding or glow effects
        const node = g
            .append("g")
            .selectAll<SVGGElement, SimNode>("g")
            .data(nodes)
            .join("g")
            .attr("cursor", (d) => (d.type === "current" ? "default" : "pointer"))
            .style("transition", "opacity 0.2s ease");

        // Dynamic node radius & typography based on sparsity
        const currentRadius = nodeCount <= 2 ? 7.5 : nodeCount <= 4 ? 7 : 6.5;
        const otherRadius = nodeCount <= 2 ? 6 : nodeCount <= 4 ? 5.5 : 5;
        const fontSize = nodeCount <= 2 ? "9.5px" : "9px";

        // Neutral circles: active node slightly lighter, all with subtle slate borders
        node.append("circle")
            .attr("r", (d) => (d.type === "current" ? currentRadius : otherRadius))
            .attr("fill", (d) => (d.type === "current" ? "#cbd5e1" : "#64748b"))
            .attr("stroke", "#1e293b")
            .attr("stroke-width", 1.5)
            .style("transition", "stroke 0.2s ease, stroke-width 0.2s ease, fill 0.2s ease");

        // Node Labels: Subtle neutral text
        node.append("text")
            .text((d) => (d.label.length > 14 ? d.label.slice(0, 14) + "…" : d.label))
            .attr("x", 0)
            .attr("y", nodeCount <= 2 ? 16 : 15)
            .attr("text-anchor", "middle")
            .attr("fill", (d) => (d.type === "current" ? "#f1f5f9" : "#94a3b8"))
            .attr("font-size", fontSize)
            .attr("font-family", "system-ui, -apple-system, sans-serif")
            .attr("pointer-events", "none");

        // Hover Tooltip & Navigation Click with Interactive Graph Focus
        node.on("mouseenter", (_, d) => {
            setHoveredNode(d);

            // Highlight hovered node circle with emerald accent
            node.selectAll<SVGCircleElement, SimNode>("circle")
                .attr("stroke", (n) => (n.id === d.id ? "#34d399" : "#1e293b"))
                .attr("stroke-width", (n) => (n.id === d.id ? 2 : 1.5));

            // Gently dim non-hovered nodes to draw immediate focus
            node.attr("opacity", (n) => (n.id === d.id ? 1 : 0.35));

            // Illuminate connected links with emerald accent, dim background links
            link.attr("stroke-opacity", (l) => {
                const sId = (l.source as SimNode).id;
                const tId = (l.target as SimNode).id;
                return sId === d.id || tId === d.id ? 0.9 : 0.12;
            })
                .attr("stroke", (l) => {
                    const sId = (l.source as SimNode).id;
                    const tId = (l.target as SimNode).id;
                    return sId === d.id || tId === d.id ? "#34d399" : "#475569";
                })
                .attr("stroke-width", (l) => {
                    const sId = (l.source as SimNode).id;
                    const tId = (l.target as SimNode).id;
                    return sId === d.id || tId === d.id ? 1.5 : 1;
                });
        })
            .on("mouseleave", () => {
                setHoveredNode(null);

                // Restore circle borders and node opacities
                node.selectAll<SVGCircleElement, SimNode>("circle")
                    .attr("stroke", "#1e293b")
                    .attr("stroke-width", 1.5);
                node.attr("opacity", 1);

                // Restore default link styling
                link.attr("stroke-opacity", 0.4)
                    .attr("stroke", "#475569")
                    .attr("stroke-width", 1);
            })
            .on("click", (_, d) => {
                if (d.type !== "current" && d.url) {
                    router.push(d.url);
                }
            });

        // Simulation tick: updates positions until cooled down
        simulation.on("tick", () => {
            for (const d of nodes) {
                d.x = Math.max(34, Math.min(width - 34, d.x || cx));
                d.y = Math.max(22, Math.min(height - 24, d.y || cy));
            }

            link.attr("x1", (d) => (d.source as SimNode).x || 0)
                .attr("y1", (d) => (d.source as SimNode).y || 0)
                .attr("x2", (d) => (d.target as SimNode).x || 0)
                .attr("y2", (d) => (d.target as SimNode).y || 0);

            node.attr("transform", (d) => `translate(${d.x || 0},${d.y || 0})`);
        });

        return () => {
            simulation.stop();
        };
    }, [graph, router]);

    if (!graph || graph.nodes.length === 0) return null;

    return (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm p-3">
            <div className="relative h-[200px] w-full">
                <svg ref={svgRef} className="w-full h-full block rounded-lg select-none" />

                {hoveredNode && (() => {
                    const nodeX = hoveredNode.x ?? 140;
                    const nodeY = hoveredNode.y ?? 100;
                    const isNearTop = nodeY < 58;
                    const clampedXPercent = Math.max(26, Math.min(74, (nodeX / 280) * 100));
                    const yPercent = (nodeY / 200) * 100;

                    return (
                        <div
                            style={{
                                left: `${clampedXPercent}%`,
                                top: `${yPercent}%`,
                                transform: isNearTop
                                    ? "translate(-50%, 18px)"
                                    : "translate(-50%, calc(-100% - 14px))",
                            }}
                            className="absolute z-20 pointer-events-none max-w-[220px] px-2.5 py-1.5 rounded-lg bg-slate-950/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-center transition-all duration-150 animate-in fade-in zoom-in-95"
                        >
                            <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-100 leading-snug">
                                {hoveredNode.type === "current" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                )}
                                <span className="break-words">{hoveredNode.label}</span>
                            </div>
                            {hoveredNode.type !== "current" && hoveredNode.url && (
                                <div className="text-[9.5px] text-emerald-400/90 mt-0.5 font-normal tracking-wide">
                                    Click to view note →
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
