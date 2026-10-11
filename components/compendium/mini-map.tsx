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

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        svg.attr("viewBox", `0 0 ${width} ${height}`)
            .attr("width", "100%")
            .attr("height", "100%");

        // Deep clone data to avoid simulation mutation bugs
        const nodes: SimNode[] = graph.nodes.map((n) => ({ ...n }));
        const links: SimLink[] = graph.links.map((l) => ({ ...l }));

        const g = svg.append("g");

        // Force Simulation - runs to equilibrium and stops (no pan drift or drag collisions)
        const simulation = d3
            .forceSimulation<SimNode>(nodes)
            .force(
                "link",
                d3
                    .forceLink<SimNode, SimLink>(links)
                    .id((d) => d.id)
                    .distance(65)
            )
            .force("charge", d3.forceManyBody().strength(-120))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(22));

        // Links: Subtle, understated neutral slate lines
        const link = g
            .append("g")
            .attr("stroke-opacity", 0.4)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke", "#475569")
            .attr("stroke-width", 1);

        // Nodes: Clean, minimalist nodes without color coding or glow effects
        const node = g
            .append("g")
            .selectAll<SVGGElement, SimNode>("g")
            .data(nodes)
            .join("g")
            .attr("cursor", (d) => (d.type === "current" ? "default" : "pointer"));

        // Neutral circles: active node slightly lighter, all with subtle slate borders
        node.append("circle")
            .attr("r", (d) => (d.type === "current" ? 6.5 : 5))
            .attr("fill", (d) => (d.type === "current" ? "#cbd5e1" : "#64748b"))
            .attr("stroke", "#1e293b")
            .attr("stroke-width", 1.5)
            .style("transition", "fill 0.15s ease");

        // Node Labels: Subtle neutral text
        node.append("text")
            .text((d) => (d.label.length > 14 ? d.label.slice(0, 14) + "…" : d.label))
            .attr("x", 0)
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .attr("fill", (d) => (d.type === "current" ? "#f1f5f9" : "#94a3b8"))
            .attr("font-size", "9px")
            .attr("font-family", "system-ui, -apple-system, sans-serif")
            .attr("pointer-events", "none");

        // Hover Tooltip & Navigation Click
        node.on("mouseenter", (_, d) => {
            setHoveredNode(d);
        })
            .on("mouseleave", () => {
                setHoveredNode(null);
            })
            .on("click", (_, d) => {
                if (d.type !== "current" && d.url) {
                    router.push(d.url);
                }
            });

        // Simulation tick: updates positions until cooled down
        simulation.on("tick", () => {
            for (const d of nodes) {
                d.x = Math.max(16, Math.min(width - 16, d.x || width / 2));
                d.y = Math.max(16, Math.min(height - 16, d.y || height / 2));
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

                {hoveredNode && (
                    <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-md bg-slate-950/90 border border-slate-800 text-[11px] text-slate-300 pointer-events-none truncate shadow-md text-center">
                        {hoveredNode.label}
                    </div>
                )}
            </div>
        </div>
    );
}
