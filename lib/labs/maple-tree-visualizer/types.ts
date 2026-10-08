// Types for the Maple Tree Visualizer
// Ported from maple-tree-visualizer/maple/trace.go

/**
 * Entry represents a mapped memory range [lo, hi] (e.g. a Virtual Memory Area / VMA).
 */
export interface Entry {
  lo: number;
  hi: number;
  label: string;
}

/**
 * SlotView provides explicit, pre-calculated geometry and boundary data
 * for every slot in a node.
 */
export interface SlotView {
  index: number;
  minBound: number;
  maxBound: number;
  isInfinite: boolean;
  childNodeId?: number; // for interior nodes
  entry?: Entry;        // for leaf nodes
}

/**
 * TreeView is the recursive JSON structure consumed by D3.js in the frontend.
 */
export interface TreeView {
  id: number;
  isLeaf: boolean;
  pivots: number[];
  slots: SlotView[];
  children?: TreeView[];
  entries?: Entry[];
  isOverflow: boolean;
  parentId: number;
}

/**
 * TraceStep records an individual operation step with a complete state snapshot
 * for time-travel visual debugging and algorithmic walkthroughs.
 */
export interface TraceStep {
  stepIndex: number;
  /** "visit" | "compare" | "descend" | "found" | "not_found" | "insert" | "overflow" | "split_redistribute" | "split" | "delete" | "underflow" | "merge" | "collapse" | "conflict" */
  action: string;
  nodeId: number;
  slotIndex: number;
  title: string;
  description: string;
  kernelReason: string;
  highlights: number[];
  activeSlot: number;
  treeSnapshot: TreeView | null;
  syscall?: string;
}

/**
 * OperationResult is the response returned after every operation.
 */
export interface OperationResult {
  success: boolean;
  error?: string;
  entry?: Entry;
  trace: TraceStep[];
  tree: TreeView | null;
}
