"use client";

import React, { useEffect, useRef } from "react";
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

        // Helper to format expanded multiline label on hover across natural semantic boundaries
        const wrapLabel = (label: string, maxChars = 20): string[] => {
            if (label.length <= maxChars) return [label];
            if (label.includes(": ")) {
                const idx = label.indexOf(": ");
                const first = label.slice(0, idx + 1);
                let second = label.slice(idx + 2);
                if (second.length > maxChars + 2) second = second.slice(0, maxChars + 2) + "…";
                return [first, second];
            }
            const words = label.split(" ");
            let line1 = "";
            let line2 = "";
            for (const w of words) {
                if (!line2 && (line1 + " " + w).trim().length <= maxChars) {
                    line1 = (line1 + " " + w).trim();
                } else {
                    line2 = (line2 + " " + w).trim();
                }
            }
            if (line2 && line2.length > maxChars + 2) {
                line2 = line2.slice(0, maxChars + 2) + "…";
            }
            return line2 ? [line1, line2] : [line1];
        };

        // Node Labels: Subtle neutral text with dark halo for crisp readability
        node.append("text")
            .text((d) => (d.label.length > 14 ? d.label.slice(0, 14) + "…" : d.label))
            .attr("x", 0)
            .attr("y", nodeCount <= 2 ? 16 : 15)
            .attr("text-anchor", "middle")
            .attr("fill", (d) => (d.type === "current" ? "#f1f5f9" : "#94a3b8"))
            .attr("font-size", fontSize)
            .attr("font-family", "system-ui, -apple-system, sans-serif")
            .attr("pointer-events", "none")
            .attr("paint-order", "stroke fill")
            .attr("stroke", "#020617")
            .attr("stroke-width", "2.5px")
            .attr("stroke-linejoin", "round");

        // Hover & Navigation: Expands bottom title directly beneath node, highlights connected graph
        node.on("mouseenter", (event, d) => {
            const targetGroup = d3.select(event.currentTarget);
            // Elevate hovered node to front so expanded text is never occluded
            targetGroup.raise();

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

            // Expand the bottom text to the full title beneath the circle
            const textEl = targetGroup.select<SVGTextElement>("text");
            textEl.text("");
            const lines = wrapLabel(d.label);
            lines.forEach((line, i) => {
                textEl
                    .append("tspan")
                    .attr("x", 0)
                    .attr("dy", i === 0 ? 0 : 12)
                    .text(line);
            });
            textEl
                .attr("fill", "#ffffff")
                .attr("font-weight", "600")
                .attr("font-size", nodeCount <= 2 ? "10px" : "9.5px");
        })
            .on("mouseleave", (event, d) => {
                const targetGroup = d3.select(event.currentTarget);

                // Restore circle borders and node opacities
                node.selectAll<SVGCircleElement, SimNode>("circle")
                    .attr("stroke", "#1e293b")
                    .attr("stroke-width", 1.5);
                node.attr("opacity", 1);

                // Restore default link styling
                link.attr("stroke-opacity", 0.4)
                    .attr("stroke", "#475569")
                    .attr("stroke-width", 1);

                // Collapse back to truncated bottom label
                const textEl = targetGroup.select<SVGTextElement>("text");
                textEl.selectAll("tspan").remove();
                textEl
                    .text(d.label.length > 14 ? d.label.slice(0, 14) + "…" : d.label)
                    .attr("fill", d.type === "current" ? "#f1f5f9" : "#94a3b8")
                    .attr("font-weight", "400")
                    .attr("font-size", fontSize);
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
                d.y = Math.max(22, Math.min(height - 30, d.y || cy));
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
            </div>
        </div>
    );
}
