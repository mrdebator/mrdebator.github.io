"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useRouter } from "next/navigation";
import { GraphNode, GraphLink, PostGraph } from "@/lib/compendium";
import { Maximize2, Minimize2, Network } from "lucide-react";

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

export default function MiniMap({ graph, currentTitle }: MiniMapProps) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);

    useEffect(() => {
        if (!svgRef.current || !graph || graph.nodes.length === 0) return;

        const width = isExpanded ? 600 : 260;
        const height = isExpanded ? 450 : 210;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        svg.attr("viewBox", `0 0 ${width} ${height}`)
            .attr("width", "100%")
            .attr("height", "100%");

        // Deep clone data to avoid simulation mutation bugs
        const nodes: SimNode[] = graph.nodes.map((n) => ({ ...n }));
        const links: SimLink[] = graph.links.map((l) => ({ ...l }));

        const g = svg.append("g");

        // Subtle background grid
        const defs = svg.append("defs");
        const pattern = defs
            .append("pattern")
            .attr("id", "mini-grid")
            .attr("width", 20)
            .attr("height", 20)
            .attr("patternUnits", "userSpaceOnUse");

        pattern
            .append("circle")
            .attr("cx", 2)
            .attr("cy", 2)
            .attr("r", 0.75)
            .attr("fill", "rgba(100, 116, 139, 0.25)");

        svg.insert("rect", ":first-child")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "url(#mini-grid)")
            .attr("opacity", 0.6);

        // Zoom & Pan
        const zoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.6, 2.5])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

        // Force Simulation
        const simulation = d3
            .forceSimulation<SimNode>(nodes)
            .force(
                "link",
                d3
                    .forceLink<SimNode, SimLink>(links)
                    .id((d) => d.id)
                    .distance((d) => (d.type === "domain" ? 65 : 85))
            )
            .force("charge", d3.forceManyBody().strength(-140))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(24));

        // Links
        const link = g
            .append("g")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke", (d) => (d.type === "domain" ? "#334155" : "#10b981"))
            .attr("stroke-width", (d) => (d.type === "domain" ? 1.2 : 1.5))
            .attr("stroke-dasharray", (d) => (d.type === "mention" ? "3,3" : "none"));

        // Drag Behavior
        const drag = d3
            .drag<SVGGElement, SimNode>()
            .on("start", (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });

        // Nodes
        const node = g
            .append("g")
            .selectAll<SVGGElement, SimNode>("g")
            .data(nodes)
            .join("g")
            .attr("cursor", (d) => (d.type === "current" ? "default" : "pointer"))
            .call(drag);

        // Node circles
        node.append("circle")
            .attr("r", (d) => (d.type === "current" ? 12 : d.type === "domain" ? 9 : 8))
            .attr("fill", (d) => {
                if (d.type === "current") return "#10b981"; // Emerald
                if (d.type === "domain") return "#3b82f6"; // Blue
                return "#64748b"; // Slate
            })
            .attr("stroke", (d) => {
                if (d.type === "current") return "rgba(16, 185, 129, 0.4)";
                if (d.type === "domain") return "rgba(59, 130, 246, 0.3)";
                return "rgba(100, 116, 139, 0.3)";
            })
            .attr("stroke-width", 4)
            .style("transition", "transform 0.15s ease");

        // Node Labels
        node.append("text")
            .text((d) => {
                const maxLen = isExpanded ? 24 : 14;
                return d.label.length > maxLen ? d.label.slice(0, maxLen) + "…" : d.label;
            })
            .attr("x", 0)
            .attr("y", (d) => (d.type === "current" ? 22 : 18))
            .attr("text-anchor", "middle")
            .attr("fill", (d) => (d.type === "current" ? "#f1f5f9" : "#94a3b8"))
            .attr("font-size", isExpanded ? "10px" : "9px")
            .attr("font-family", "system-ui, -apple-system, sans-serif")
            .attr("pointer-events", "none");

        // Hover & Click
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

        // Simulation tick
        simulation.on("tick", () => {
            link.attr("x1", (d) => (d.source as SimNode).x || 0)
                .attr("y1", (d) => (d.source as SimNode).y || 0)
                .attr("x2", (d) => (d.target as SimNode).x || 0)
                .attr("y2", (d) => (d.target as SimNode).y || 0);

            node.attr("transform", (d) => `translate(${d.x || 0},${d.y || 0})`);
        });

        return () => {
            simulation.stop();
        };
    }, [graph, isExpanded, router]);

    return (
        <div
            ref={containerRef}
            className={`rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm p-3 transition-all ${
                isExpanded ? "fixed inset-8 z-50 flex flex-col bg-slate-950/95 shadow-2xl" : "relative"
            }`}
        >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/70">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                    <Network className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Concept Mini-Map</span>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                    title={isExpanded ? "Collapse" : "Expand"}
                    aria-label={isExpanded ? "Collapse mini-map" : "Expand mini-map"}
                >
                    {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
            </div>

            <div className={`relative ${isExpanded ? "flex-1 w-full" : "h-[190px] w-full"}`}>
                <svg ref={svgRef} className="w-full h-full block rounded-lg select-none" />

                {hoveredNode && (
                    <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1.5 rounded-md bg-slate-950/90 border border-slate-700 text-[11px] text-slate-200 pointer-events-none truncate shadow-lg">
                        <span className="font-semibold text-emerald-400">
                            {hoveredNode.type === "current"
                                ? "Current Note: "
                                : hoveredNode.type === "domain"
                                  ? "Domain: "
                                  : "Linked Note: "}
                        </span>
                        {hoveredNode.label}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/50 text-[10px] text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Active
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block ml-1" /> Domain
                </span>
                <span>Drag to explore</span>
            </div>
        </div>
    );
}
