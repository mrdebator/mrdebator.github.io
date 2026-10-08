"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';
import { TreeView } from '@/lib/labs/maple-tree-visualizer/types';

export interface TreeCanvasHandle {
  fitScreen: (animate?: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface TreeCanvasProps {
  treeData: TreeView | null;
  highlights: number[];
  actionClass: string;
  activeSlot: number;
}

const is48BitAddress = (val: number | undefined | null): boolean => {
  if (val === undefined || val === null) return false;
  return val > 0xffffffff || val.toString(16).length > 8;
};

const has48BitAddresses = (data: TreeView | null | undefined): boolean => {
  if (!data) return false;
  if (data.pivots && data.pivots.some(p => is48BitAddress(p))) return true;
  if (data.entries && data.entries.some(e => is48BitAddress(e.lo) || is48BitAddress(e.hi))) return true;
  if (data.slots && data.slots.some(s => 
    (!s.isInfinite && is48BitAddress(s.maxBound)) ||
    (s.entry && (is48BitAddress(s.entry.lo) || is48BitAddress(s.entry.hi)))
  )) return true;
  return false;
};

const treeHas48BitAddresses = (root: TreeView | null | undefined): boolean => {
  if (!root) return false;
  if (has48BitAddresses(root)) return true;
  if (root.children && root.children.some(c => treeHas48BitAddresses(c))) return true;
  return false;
};

const getNodeWidth = (data: TreeView, isTree48Bit: boolean) => {
  const numSlots = (data.slots && data.slots.length > 0) ? data.slots.length : 1;
  const isLong = isTree48Bit || has48BitAddresses(data);
  
  if (isLong) {
    // 48-bit address space (e.g. ASLR demo, 64-bit ELF VMAs):
    // Slot width = 136px gives ample padding for 14-18 char hex addresses
    const slotW = 136;
    return Math.max(280, numSlots * slotW);
  }
  
  // Standard address space (CS algorithms, 32-bit addresses):
  // Minimum 112px per slot ensuring generous clearance for all 32-bit addresses,
  // badges, and pivots, with minimum card width 280px for 1-2 slot nodes.
  const slotW = 112;
  return Math.max(280, numSlots * slotW);
};

const TreeCanvas = forwardRef<TreeCanvasHandle, TreeCanvasProps>(
  ({ treeData, highlights, actionClass, activeSlot }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const d3StateRef = useRef<any>(null);

    // Initialization
    useEffect(() => {
      if (!containerRef.current) return;
      const container = d3.select(containerRef.current);
      
      const bounds = container.node()?.getBoundingClientRect() || { width: 900, height: 600 };
      let width = bounds.width;
      let height = bounds.height;

      const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", "100%");

      const defs = svg.append("defs");
      const pattern = defs.append("pattern")
        .attr("id", "blueprint-grid")
        .attr("width", 40)
        .attr("height", 40)
        .attr("patternUnits", "userSpaceOnUse");
      
      pattern.append("circle")
        .attr("cx", 2)
        .attr("cy", 2)
        .attr("r", 1)
        .attr("fill", "rgba(51, 65, 85, 0.35)");

      const gridRect = svg.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "url(#blueprint-grid)");

      const zoomGroup = svg.append("g");

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.15, 3])
        .on("zoom", (e) => {
          zoomGroup.attr("transform", e.transform);
          pattern.attr("patternTransform", `translate(${e.transform.x},${e.transform.y}) scale(${e.transform.k})`);
        });

      svg.call(zoom);

      const gLinks = zoomGroup.append("g").attr("class", "links");
      const gNodes = zoomGroup.append("g").attr("class", "nodes");

      const treeLayout = d3.tree<TreeView>().nodeSize([1, 185]);

      d3StateRef.current = {
        container, svg, zoomGroup, zoom, gLinks, gNodes, treeLayout,
        width, height, pattern,
        interiorHeight: 76,
        leafHeight: 124
      };

      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          const newW = entry.contentRect.width;
          const newH = entry.contentRect.height;
          const state = d3StateRef.current;
          if (newW > 0 && newH > 0 && state && (Math.abs(newW - state.width) > 30 || Math.abs(newH - state.height) > 30)) {
            state.width = newW;
            state.height = newH;
            if (state.currentTreeData) {
              fitScreen(false);
            }
          }
        }
      });
      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        container.selectAll("*").remove();
        d3StateRef.current = null;
      };
    }, []);

    const fitScreen = (animate = true) => {
      const state = d3StateRef.current;
      if (!state || !state.latestBounds) return;

      const bounds = state.container.node()?.getBoundingClientRect() || { width: 900, height: 600 };
      state.width = bounds.width;
      state.height = bounds.height;

      const { minX, maxX, minY, maxY } = state.latestBounds;
      const padding = 60;
      const treeW = Math.max(1, maxX - minX);
      const treeH = Math.max(1, maxY - minY);
      const scale = Math.min(
        1.5,
        0.9 * Math.min(state.width / (treeW + padding * 2), state.height / (treeH + padding * 2))
      );
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const transform = d3.zoomIdentity
        .translate(state.width / 2, state.height / 2)
        .scale(scale)
        .translate(-cx, -cy);

      if (animate) {
        state.svg.transition().duration(400).call(state.zoom.transform, transform);
      } else {
        state.svg.call(state.zoom.transform, transform);
      }
    };

    useImperativeHandle(ref, () => ({
      fitScreen,
      zoomIn: () => {
        const state = d3StateRef.current;
        if (state) state.svg.transition().duration(300).call(state.zoom.scaleBy, 1.25);
      },
      zoomOut: () => {
        const state = d3StateRef.current;
        if (state) state.svg.transition().duration(300).call(state.zoom.scaleBy, 0.8);
      }
    }));

    // Rendering
    useEffect(() => {
      const state = d3StateRef.current;
      if (!state) return;
      state.currentTreeData = treeData;

      const { gNodes, gLinks, treeLayout, interiorHeight, leafHeight } = state;

      const isTree48Bit = treeHas48BitAddresses(treeData);
      const getNodeWidthForNode = (data: TreeView) => getNodeWidth(data, isTree48Bit);

      treeLayout
        .nodeSize([1, 185])
        .separation((a: any, b: any) => {
          const wa = getNodeWidthForNode(a.data);
          const wb = getNodeWidthForNode(b.data);
          const minGap = 44;
          const dist = (wa + wb) / 2 + minGap;
          return a.parent === b.parent ? dist : dist + 36;
        });

      const processTreeData = (nodeData: TreeView | null): any => {
        if (!nodeData) return null;
        let d = { ...nodeData };
        if (d.children && d.children.length > 0) {
          d.children = d.children.map(c => processTreeData(c));
        } else {
          d.children = undefined;
        }
        return d;
      };

      if (!treeData) {
        gNodes.selectAll("*").remove();
        gLinks.selectAll("*").remove();
        return;
      }

      const rootData = processTreeData(treeData);
      const root = d3.hierarchy<any>(rootData);
      treeLayout(root);

      const nodes = root.descendants();
      const links = root.links();

      // Dynamic Auto-Centering & Camera Framing
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodes.forEach((d: any) => {
        const w = getNodeWidthForNode(d.data);
        const h = d.data.isLeaf ? leafHeight : interiorHeight;
        minX = Math.min(minX, d.x - w / 2);
        maxX = Math.max(maxX, d.x + w / 2);
        minY = Math.min(minY, d.y);
        maxY = Math.max(maxY, d.y + h);
      });

      const prevBounds = state.latestBounds;
      const boundsChanged = !prevBounds ||
        Math.abs(prevBounds.minX - minX) > 2 ||
        Math.abs(prevBounds.maxX - maxX) > 2 ||
        Math.abs(prevBounds.minY - minY) > 2 ||
        Math.abs(prevBounds.maxY - maxY) > 2;

      if (minX !== Infinity) {
        state.latestBounds = { minX, maxX, minY, maxY };
        if (boundsChanged) {
          fitScreen(false);
        }
      }

      // Links
      const link = gLinks.selectAll("path.link")
        .data(links, (d: any) => `${d.source.data.id}-${d.target.data.id}`);

      const getLinkPath = (d: any) => {
        const sourceW = getNodeWidthForNode(d.source.data);
        const sourceH = d.source.data.isLeaf ? leafHeight : interiorHeight;
        
        let slotIdx = 0;
        if (d.source.data.slots) {
          const foundIdx = d.source.data.slots.findIndex((s: any) => s.childNodeId === d.target.data.id);
          if (foundIdx !== -1) slotIdx = foundIdx;
          else if (d.source.children) slotIdx = d.source.children.indexOf(d.target);
        }
        
        const numSlots = (d.source.data.slots && d.source.data.slots.length > 0) ? d.source.data.slots.length : 1;
        const cellW = sourceW / numSlots;
        const slotX = d.source.x - sourceW/2 + (slotIdx + 0.5) * cellW;
        const slotY = d.source.y + sourceH;
        
        const targetX = d.target.x;
        const targetY = d.target.y;
        
        return `M ${slotX} ${slotY} C ${slotX} ${(slotY + targetY) / 2}, ${targetX} ${(slotY + targetY) / 2}, ${targetX} ${targetY}`;
      };

      const linkEnter = link.enter().append("path")
        .attr("class", "link")
        .attr("d", getLinkPath);

      // Nodes
      const node = gNodes.selectAll("g.node")
        .data(nodes, (d: any) => d.data.id);

      const isStructureChange = !linkEnter.empty() || !node.exit().empty();

      if (isStructureChange) {
        link.merge(linkEnter as any).transition().duration(250)
          .attr("d", getLinkPath)
          .attr("class", (d: any) => {
            const isActive = highlights.includes(d.source.data.id) && highlights.includes(d.target.data.id);
            return isActive ? "link link-active" : "link";
          });
      } else {
        link.merge(linkEnter as any)
          .attr("d", getLinkPath)
          .attr("class", (d: any) => {
            const isActive = highlights.includes(d.source.data.id) && highlights.includes(d.target.data.id);
            return isActive ? "link link-active" : "link";
          });
      }

      link.exit().remove();

      const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("id", (d: any) => `node-${d.data.id}`)
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);

      const nodeMerge = node.merge(nodeEnter as any);
      
      nodeMerge.each(function(this: any, d: any) {
        const group = d3.select(this);
        group.selectAll("*").remove();
        
        const isLeaf = d.data.isLeaf;
        const isOverflow = d.data.isOverflow;
        const w = getNodeWidthForNode(d.data);
        const h = isLeaf ? leafHeight : interiorHeight;
        const numSlots = (d.data.slots && d.data.slots.length > 0) ? d.data.slots.length : 1;
        const cellW = w / numSlots;

        group.attr("class", `node ${isLeaf ? 'node-leaf' : 'node-interior'} ${isOverflow ? 'node-overflow' : ''}`);

        // SVG clip-path strictly bounding slot contents to the node card's rounded border
        const clipId = `card-clip-${d.data.id}`;
        group.append("clipPath")
          .attr("id", clipId)
          .append("rect")
          .attr("x", -w/2)
          .attr("y", 0)
          .attr("width", w)
          .attr("height", h)
          .attr("rx", 6)
          .attr("ry", 6);

        group.append("rect")
          .attr("class", "main-rect")
          .attr("x", -w/2)
          .attr("y", 0)
          .attr("width", w)
          .attr("height", h)
          .attr("rx", 6)
          .attr("ry", 6);

        group.append("path")
          .attr("class", "header-bg")
          .attr("d", `M ${-w/2+6} 0 L ${w/2-6} 0 A 6 6 0 0 1 ${w/2} 6 L ${w/2} 26 L ${-w/2} 26 L ${-w/2} 6 A 6 6 0 0 1 ${-w/2+6} 0 Z`);

        group.append("text")
          .attr("x", -w/2 + 10)
          .attr("y", 18)
          .attr("fill", isOverflow ? "#f87171" : (isLeaf ? "#34d399" : "#38bdf8"))
          .style("font-size", "11px")
          .style("font-weight", "600")
          .text(`Node ${d.data.id} • ${isLeaf ? 'Leaf' : 'Interior'}`);

        group.append("text")
          .attr("x", w/2 - 10)
          .attr("y", 18)
          .attr("text-anchor", "end")
          .attr("fill", isOverflow ? "#f87171" : "#94a3b8")
          .style("font-size", "10px")
          .style("font-weight", isOverflow ? "700" : "500")
          .text(isOverflow ? `OVERFLOW (${numSlots} slots)` : `${numSlots} slots`);

        // Slot content group clipped to rounded card boundaries
        const slotGroup = group.append("g")
          .attr("class", "slot-content-group")
          .attr("clip-path", `url(#${clipId})`);

        for (let j = 0; j < numSlots; j++) {
          const cellX = -w/2 + j * cellW;
          const slot = d.data.slots ? d.data.slots[j] : null;
          
          if (j > 0) {
            slotGroup.append("line")
              .attr("x1", cellX)
              .attr("y1", 26)
              .attr("x2", cellX)
              .attr("y2", h)
              .attr("stroke", "var(--border-color)")
              .attr("stroke-dasharray", isLeaf ? "none" : "2,2");
          }

          if (highlights.includes(d.data.id) && activeSlot === j) {
            slotGroup.append("rect")
              .attr("class", actionClass === 'conflict' ? "slot-conflict-rect" : "slot-highlight-rect")
              .attr("x", cellX + 1)
              .attr("y", 27)
              .attr("width", cellW - 2)
              .attr("height", h - 28)
              .attr("rx", 3);
          }

          slotGroup.append("text")
            .attr("class", "slot-label")
            .attr("x", cellX + cellW/2)
            .attr("y", 40)
            .attr("text-anchor", "middle")
            .attr("fill", "var(--text-muted)")
            .style("font-size", "10px")
            .style("font-weight", "500")
            .text(`s[${j}]`);

          let boundText = "∞";
          if (d.data.pivots && j < d.data.pivots.length) {
            boundText = `≤ 0x${d.data.pivots[j].toString(16)}`;
          } else if (slot && !slot.isInfinite && slot.maxBound !== undefined && slot.maxBound < 0xffffffffffffffff) {
            boundText = `≤ 0x${slot.maxBound.toString(16)}`;
          }

          const pivotFontSize = boundText.length > 18
            ? "8px"
            : (boundText.length > 14
              ? "8.5px"
              : (boundText.length > 10 ? "9px" : "10px"));

          slotGroup.append("text")
            .attr("class", "pivot-label")
            .attr("x", cellX + cellW/2)
            .attr("y", 54)
            .attr("text-anchor", "middle")
            .attr("fill", "var(--text-main)")
            .style("font-size", pivotFontSize)
            .style("font-weight", "600")
            .text(boundText);

          if (isLeaf && slot && slot.entry) {
            const entry = slot.entry;
            const vmaY = 64;
            const badgeH = 20;
            const badgePadding = 6;
            const badgeW = cellW - (badgePadding * 2);

            slotGroup.append("rect")
              .attr("class", "vma-badge")
              .attr("x", cellX + badgePadding)
              .attr("y", vmaY)
              .attr("width", badgeW)
              .attr("height", badgeH)
              .attr("rx", 4)
              .attr("fill", "rgba(5, 150, 105, 0.85)")
              .attr("stroke", "rgba(16, 185, 129, 0.4)")
              .attr("stroke-width", 1);

            const rawLabel = entry.label || 'VMA';
            const maxChars = Math.max(6, Math.floor((badgeW - 10) / 6.6));
            const displayLabel = rawLabel.length > maxChars ? rawLabel.slice(0, maxChars - 1) + '…' : rawLabel;
            const labelFontSize = displayLabel.length > 11 ? "9px" : "10px";

            const labelEl = slotGroup.append("text")
              .attr("class", "vma-badge-label")
              .attr("x", cellX + cellW/2)
              .attr("y", vmaY + 14)
              .attr("text-anchor", "middle")
              .attr("fill", "#ffffff")
              .style("font-size", labelFontSize)
              .style("font-weight", "700")
              .text(displayLabel);

            if (rawLabel !== displayLabel) {
              labelEl.append("title").text(rawLabel);
            }

            const loHex = '0x' + entry.lo.toString(16);
            const hiHex = '0x' + entry.hi.toString(16);
            const singleRangeStr = `${loHex}–${hiHex}`;
            const fitsSingleLine = singleRangeStr.length <= 14 || (cellW >= 120 && singleRangeStr.length <= 16);

            if (fitsSingleLine) {
              slotGroup.append("text")
                .attr("class", "vma-range-text")
                .attr("x", cellX + cellW/2)
                .attr("y", 104)
                .attr("text-anchor", "middle")
                .attr("fill", "#94a3b8")
                .style("font-size", "8.5px")
                .text(singleRangeStr);
            } else {
              const rangeFontSize = (loHex.length > 16 || hiHex.length > 16)
                ? "7.5px"
                : (loHex.length > 12 || hiHex.length > 12)
                ? "8px"
                : "8.5px";
              
              slotGroup.append("text")
                .attr("class", "vma-range-text")
                .attr("x", cellX + cellW/2)
                .attr("y", 98)
                .attr("text-anchor", "middle")
                .attr("fill", "#94a3b8")
                .style("font-size", rangeFontSize)
                .text(loHex);

              slotGroup.append("text")
                .attr("class", "vma-range-text")
                .attr("x", cellX + cellW/2)
                .attr("y", 111)
                .attr("text-anchor", "middle")
                .attr("fill", "#94a3b8")
                .style("font-size", rangeFontSize)
                .text(`– ${hiHex}`);
            }
          } else if (!isLeaf) {
            slotGroup.append("path")
              .attr("d", `M ${cellX + cellW/2 - 3.5} 65 L ${cellX + cellW/2 + 3.5} 65 L ${cellX + cellW/2} 69 Z`)
              .attr("fill", "#38bdf8");
          }
        }
      });

      if (isStructureChange) {
        nodeMerge.transition().duration(250)
          .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      } else {
        nodeMerge.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      }

      node.exit().transition().duration(250).style("opacity", 0).remove();

      // Highlight logic
      gNodes.selectAll("g.node")
        .classed("highlight-visit", false)
        .classed("highlight-compare", false)
        .classed("highlight-found", false)
        .classed("highlight-conflict", false)
        .classed("highlight-overflow", false)
        .classed("highlight-split_redistribute", false)
        .classed("highlight-split", false)
        .classed("highlight-collapse", false);
        
      if (highlights && highlights.length > 0) {
        highlights.forEach(id => {
          const n = gNodes.select(`#node-${id}`);
          if (!n.empty() && actionClass) {
            n.classed(`highlight-${actionClass}`, true);
          }
        });
      }
    }, [treeData, highlights, actionClass, activeSlot]);

    return (
      <div id="tree-container" ref={containerRef} className="w-full h-full flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative" />
    );
  }
);

TreeCanvas.displayName = 'TreeCanvas';
export default TreeCanvas;
