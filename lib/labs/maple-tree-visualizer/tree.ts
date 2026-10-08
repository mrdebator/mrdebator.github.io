import { Entry, SlotView, TreeView, TraceStep, OperationResult } from './types';

export const MAX_SAFE_VADDR = 0x00007fffffffffff; // 128 TB canonical 48-bit user virtual address space
export const MAX_ADDRESS = MAX_SAFE_VADDR;

/**
 * Validates that an address is a valid non-negative integer within canonical 48-bit virtual address space (0x0 to 0x7fffffffffff = 128 TB).
 * Defensively guards against NaN, non-numeric values, negative numbers, floats, non-safe integers, and values exceeding 48-bit user space.
 */
export function isValidAddress(addr: any): addr is number {
  return (
    typeof addr === 'number' &&
    !Number.isNaN(addr) &&
    Number.isFinite(addr) &&
    Number.isInteger(addr) &&
    Number.isSafeInteger(addr) &&
    addr >= 0 &&
    addr <= MAX_SAFE_VADDR
  );
}

export class MapleNode {
  id: number;
  isLeaf: boolean;
  pivots: number[];
  children: MapleNode[];
  entries: Entry[];
  parent: MapleNode | null;
  isOverflow: boolean;

  constructor(id: number, isLeaf: boolean) {
    this.id = id;
    this.isLeaf = isLeaf;
    this.pivots = [];
    this.children = [];
    this.entries = [];
    this.parent = null;
    this.isOverflow = false;
  }

  getUpperBoundary(): { maxBound: number; isRightmost: boolean } {
    let curr: MapleNode = this;
    while (curr.parent) {
      const parent = curr.parent;
      const childIdx = parent.children.indexOf(curr);
      if (childIdx !== -1) {
        if (childIdx < parent.pivots.length) {
          return { maxBound: parent.pivots[childIdx], isRightmost: false };
        }
      }
      curr = parent;
    }
    return { maxBound: MAX_SAFE_VADDR, isRightmost: true };
  }

  toView(): TreeView | null {
    const tv: TreeView = {
      id: this.id,
      isLeaf: this.isLeaf,
      pivots: [...this.pivots],
      isOverflow: this.isOverflow,
      parentId: this.parent ? this.parent.id : 0,
      slots: []
    };

    const upper = this.getUpperBoundary();

    if (this.isLeaf) {
      tv.entries = [...this.entries];
      tv.slots = new Array(this.entries.length);
      for (let i = 0; i < this.entries.length; i++) {
        const e = this.entries[i];
        let maxBound = e.hi;
        let minBound = e.lo;
        if (i > 0) {
          minBound = this.entries[i - 1].hi + 1;
        }
        let isInf = false;
        if (i === this.entries.length - 1) {
          isInf = upper.isRightmost;
          maxBound = isInf ? MAX_SAFE_VADDR : upper.maxBound;
        }
        tv.slots[i] = {
          index: i,
          minBound,
          maxBound,
          isInfinite: isInf,
          entry: { ...e }
        };
      }
    } else {
      tv.children = new Array(this.children.length);
      for (let i = 0; i < this.children.length; i++) {
        const childView = this.children[i].toView();
        if (childView) {
          tv.children[i] = childView;
        }
      }
      const numSlots = this.children.length;
      tv.slots = new Array(numSlots);
      for (let i = 0; i < this.children.length; i++) {
        const child = this.children[i];
        let minBound = 0;
        if (i > 0 && i - 1 < this.pivots.length) {
          minBound = this.pivots[i - 1] + 1;
        }
        let maxBound = MAX_SAFE_VADDR;
        let isInf = true;
        if (i < this.pivots.length) {
          maxBound = this.pivots[i];
          isInf = false;
        } else {
          maxBound = upper.maxBound;
          isInf = upper.isRightmost;
        }
        tv.slots[i] = {
          index: i,
          minBound,
          maxBound,
          isInfinite: isInf,
          childNodeId: child.id
        };
      }
    }
    return tv;
  }

  updateLeafPivots() {
    if (!this.isLeaf) {
      return;
    }
    if (this.entries.length <= 1) {
      this.pivots = [];
      return;
    }
    this.pivots = new Array(this.entries.length - 1);
    for (let i = 0; i < this.entries.length - 1; i++) {
      this.pivots[i] = this.entries[i].hi;
    }
  }
}

export function nodeTypeStr(isLeaf: boolean): string {
  if (isLeaf) {
    return "Leaf";
  }
  return "Interior";
}

export function findEntrySlot(entries: Entry[], target: Entry): number {
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.lo === target.lo && e.hi === target.hi) {
      return i;
    }
  }
  return -1;
}

export class MapleTree {
  root: MapleNode | null;
  order: number;
  nextId: number;
  currentSyscall: string;

  constructor(order: number) {
    if (!Number.isSafeInteger(order) || order < 3) {
      order = 4;
    }
    if (order > 16) {
      order = 16;
    }
    this.order = order;
    this.nextId = 1;
    this.currentSyscall = `mt_init(order=${order})`;
    this.root = this.newNode(true);
  }

  newNode(isLeaf: boolean): MapleNode {
    const n = new MapleNode(this.nextId, isLeaf);
    this.nextId++;
    return n;
  }

  snapshot(): TreeView | null {
    if (!this.root) {
      return null;
    }
    return this.root.toView();
  }

  recordStep(trace: TraceStep[], action: string, nodeId: number, slotIdx: number, title: string, desc: string, reason: string, highlights: number[], activeSlot: number) {
    const isMutation = action === 'insert' || action === 'delete' || action === 'split' || action === 'collapse' || action === 'split_redistribute';
    let snapshot: TreeView | null;
    if (isMutation || trace.length === 0 || !trace[trace.length - 1].treeSnapshot) {
      snapshot = this.snapshot();
    } else {
      snapshot = trace[trace.length - 1].treeSnapshot;
    }

    const step: TraceStep = {
      stepIndex: trace.length,
      action: action,
      nodeId: nodeId,
      slotIndex: slotIdx,
      title: title,
      description: desc,
      kernelReason: reason,
      highlights: highlights,
      activeSlot: activeSlot,
      treeSnapshot: snapshot,
      syscall: this.currentSyscall || undefined
    };
    trace.push(step);
  }

  search(addr: number): OperationResult {
    if (!isValidAddress(addr)) {
      return {
        success: false,
        error: `Invalid address: ${addr}. Address must be a non-negative integer within canonical 48-bit address space (0x0 to 0x7fffffffffff).`,
        trace: [],
        tree: this.snapshot()
      };
    }

    this.currentSyscall = `page_fault(0x${addr.toString(16)})`;
    const trace: TraceStep[] = [];
    let curr = this.root;

    if (!curr) {
      return { success: false, error: "Root is null", trace, tree: null };
    }

    while (true) {
      this.recordStep(trace, "visit", curr.id, -1,
        `Visiting Node ${curr.id} (${nodeTypeStr(curr.isLeaf)})`,
        `Looking up virtual address 0x${addr.toString(16)} at Node ${curr.id} (${nodeTypeStr(curr.isLeaf)}).`,
        "In Linux 6.1+, each 256-byte node spans 4 contiguous L1 cache lines. Reading an entire node requires only one memory fetch burst.",
        [curr.id], -1);

      if (curr.isLeaf) {
        // Scan leaf slots
        for (let i = 0; i < curr.entries.length; i++) {
          const entry = curr.entries[i];
          this.recordStep(trace, "compare", curr.id, i,
            `Checking Leaf Slot [${i}]: ${entry.label}`,
            `Testing if address 0x${addr.toString(16)} falls within '${entry.label}' range [0x${entry.lo.toString(16)} - 0x${entry.hi.toString(16)}].`,
            "Leaf slots map directly to vm_area_struct pointers in the kernel mm_struct.",
            [curr.id], i);

          if (addr >= entry.lo && addr <= entry.hi) {
            this.recordStep(trace, "found", curr.id, i,
              `VMA Found: ${entry.label}`,
              `Address 0x${addr.toString(16)} successfully resolved to VMA '${entry.label}' [0x${entry.lo.toString(16)} - 0x${entry.hi.toString(16)}] at Node ${curr.id}, slot[${i}].`,
              "Fast address resolution allows lockless page-fault handling via RCU without acquiring the mmap write lock.",
              [curr.id], i);

            return {
              success: true,
              entry: { ...entry },
              trace: trace,
              tree: this.snapshot()
            };
          }
        }

        this.recordStep(trace, "not_found", curr.id, -1,
          "Address Not Mapped",
          `Address 0x${addr.toString(16)} does not fall within any mapped VMA in leaf Node ${curr.id}.`,
          "In the kernel, an unmapped address triggers a page fault SIGSEGV (Segmentation Fault).",
          [curr.id], -1);

        return {
          success: false,
          error: `Virtual address 0x${addr.toString(16)} is not mapped to any VMA`,
          trace: trace,
          tree: this.snapshot()
        };
      }

      // Interior node: route via pivots
      let slot: number = curr.pivots.length; // default to implied maximum slot
      for (let i = 0; i < curr.pivots.length; i++) {
        const pivot = curr.pivots[i];
        this.recordStep(trace, "compare", curr.id, i,
          `Evaluating Pivot [${i}]: ≤ 0x${pivot.toString(16)}`,
          `Comparing target 0x${addr.toString(16)} with pivot[${i}] (0x${pivot.toString(16)}).`,
          "Pivots represent inclusive upper boundaries. A target less than or equal to pivot[i] routes into slot[i].",
          [curr.id], i);

        if (addr <= pivot) {
          slot = i;
          this.recordStep(trace, "descend", curr.id, slot,
            `Routing through Slot [${slot}] (≤ 0x${pivot.toString(16)})`,
            `0x${addr.toString(16)} ≤ 0x${pivot.toString(16)}. Descending to child Node ${curr.children[slot].id}.`,
            "Maple Tree nodes have a high branching factor (up to 16), ensuring the tree depth rarely exceeds 3 or 4 levels.",
            [curr.id, curr.children[slot].id], slot);
          break;
        }
      }

      if (slot === curr.pivots.length) {
        this.recordStep(trace, "descend", curr.id, slot,
          `Routing through Rightmost Slot [${slot}] (> 0x${curr.pivots[curr.pivots.length - 1].toString(16)})`,
          `0x${addr.toString(16)} > all pivots in Node ${curr.id}. Descending via rightmost slot[${slot}] (implied maximum) to child Node ${curr.children[slot].id}.`,
          "The rightmost slot covers all addresses above the last explicit pivot up to the parent's upper limit.",
          [curr.id, curr.children[slot].id], slot);
      }

      curr = curr.children[slot];
    }
  }

  insert(lo: number, hi: number, label: string): OperationResult {
    if (!isValidAddress(lo)) {
      return {
        success: false,
        error: `Invalid start address (lo): ${lo}. Must be a non-negative integer within canonical 48-bit address space (0x0 to 0x7fffffffffff).`,
        trace: [],
        tree: this.snapshot()
      };
    }
    if (!isValidAddress(hi)) {
      return {
        success: false,
        error: `Invalid end address (hi): ${hi}. Must be a non-negative integer within canonical 48-bit address space (0x0 to 0x7fffffffffff).`,
        trace: [],
        tree: this.snapshot()
      };
    }
    if (lo > hi) {
      return {
        success: false,
        error: `Invalid range: lo (0x${lo.toString(16)}) > hi (0x${hi.toString(16)})`,
        trace: [],
        tree: this.snapshot()
      };
    }
    if (typeof label !== 'string' || !label.trim()) {
      return {
        success: false,
        error: `Invalid label: ${label}. Must be a non-empty string.`,
        trace: [],
        tree: this.snapshot()
      };
    }

    this.currentSyscall = `mmap(0x${lo.toString(16)}, 0x${hi.toString(16)}, "${label}")`;
    const trace: TraceStep[] = [];

    const newEntry: Entry = { lo, hi, label };

    let curr = this.root;
    if (!curr) {
      return { success: false, error: "Root is null", trace, tree: null };
    }

    while (!curr.isLeaf) {
      this.recordStep(trace, "visit", curr.id, -1,
        `Traversing Interior Node ${curr.id}`,
        `Finding insertion leaf for VMA '${label}' [0x${lo.toString(16)} - 0x${hi.toString(16)}].`,
        "Tree traversal uses mas_walk() to locate the target leaf based on the start index of the range.",
        [curr.id], -1);

      let slot: number = curr.pivots.length;
      for (let i = 0; i < curr.pivots.length; i++) {
        const pivot = curr.pivots[i];
        this.recordStep(trace, "compare", curr.id, i,
          `Comparing Start 0x${lo.toString(16)} to Pivot [${i}]: 0x${pivot.toString(16)}`,
          `Testing if start address 0x${lo.toString(16)} ≤ pivot[${i}] (0x${pivot.toString(16)}).`,
          "Pivots route ranges by their boundary limits.",
          [curr.id], i);

        if (lo <= pivot) {
          slot = i;
          break;
        }
      }

      this.recordStep(trace, "descend", curr.id, slot,
        `Descending to Child Node ${curr.children[slot].id} via Slot [${slot}]`,
        `Selected slot[${slot}] to reach child Node ${curr.children[slot].id}.`,
        "Descending down the B-tree branch.",
        [curr.id, curr.children[slot].id], slot);

      curr = curr.children[slot];
    }

    this.recordStep(trace, "visit", curr.id, -1,
      `Reached Target Leaf Node ${curr.id}`,
      `Target leaf found: Node ${curr.id} currently contains ${curr.entries.length}/${this.order} entries.`,
      "Leaf nodes hold the actual VMA descriptor pointers.",
      [curr.id], -1);

    // Check for overlapping ranges
    for (const e of curr.entries) {
      if (!(hi < e.lo || lo > e.hi)) {
        const slotIdx = findEntrySlot(curr.entries, e);
        const isStackClash = label.toLowerCase().includes("stack_clash");
        const conflictReason = isStackClash
          ? "CVE-2017-1000364 Stack Clash Mitigation: The Linux kernel mm enforces guard pages and strict non-overlapping VMA bounds. Downward stack expansion colliding with an existing VMA is denied with -ENOMEM, preventing stack-pointer jumping attacks."
          : "Linux kernel invariant: A process cannot map overlapping virtual memory areas without first unmapping the existing range via munmap() or MAP_FIXED.";

        this.recordStep(trace, "conflict", curr.id, slotIdx,
          `Range Conflict with '${e.label}'`,
          `Cannot insert [0x${lo.toString(16)} - 0x${hi.toString(16)}]: overlaps with existing VMA '${e.label}' [0x${e.lo.toString(16)} - 0x${e.hi.toString(16)}] at slot[${slotIdx}] of Node ${curr.id}.`,
          conflictReason,
          [curr.id], slotIdx);

        return {
          success: false,
          error: `Range [0x${lo.toString(16)} - 0x${hi.toString(16)}] overlaps with existing VMA '${e.label}' [0x${e.lo.toString(16)} - 0x${e.hi.toString(16)}]`,
          trace: trace,
          tree: this.snapshot()
        };
      }
    }

    // Insert entry into leaf in sorted order
    curr.entries.push(newEntry);
    curr.entries.sort((a, b) => a.lo - b.lo);
    curr.updateLeafPivots();
    const insertSlot = findEntrySlot(curr.entries, newEntry);

    this.recordStep(trace, "insert", curr.id, insertSlot,
      `Placed '${label}' into Leaf Node ${curr.id}`,
      `Inserted VMA '${label}' [0x${lo.toString(16)} - 0x${hi.toString(16)}] at slot[${insertSlot}]. Node ${curr.id} now has ${curr.entries.length} entries.`,
      "Entries in a leaf node are kept strictly ordered by address.",
      [curr.id], insertSlot);

    // Check if leaf overflows
    if (curr.entries.length > this.order) {
      curr.isOverflow = true;
      this.recordStep(trace, "overflow", curr.id, -1,
        `Node ${curr.id} Overfilled (${curr.entries.length}/${this.order} slots)`,
        `Node ${curr.id} exceeded capacity (has ${curr.entries.length} entries, max is ${this.order}). Evaluating B* redistribution before splitting.`,
        "B* trees prioritize borrowing or shifting entries to adjacent siblings to maintain an 80-90% fill factor and prevent premature node allocations.",
        [curr.id], -1);

      this.handleOverflow(curr, trace);
    } else {
      this.recomputeAncestorPivots(curr);
    }

    return {
      success: true,
      trace: trace,
      tree: this.snapshot()
    };
  }

  delete(lo: number, hi: number): OperationResult {
    if (!isValidAddress(lo)) {
      return {
        success: false,
        error: `Invalid start address (lo): ${lo}. Must be a non-negative integer within canonical 48-bit address space (0x0 to 0x7fffffffffff).`,
        trace: [],
        tree: this.snapshot()
      };
    }
    if (!isValidAddress(hi)) {
      return {
        success: false,
        error: `Invalid end address (hi): ${hi}. Must be a non-negative integer within canonical 48-bit address space (0x0 to 0x7fffffffffff).`,
        trace: [],
        tree: this.snapshot()
      };
    }
    if (hi > 0 && lo > hi) {
      return {
        success: false,
        error: `Invalid range: lo (0x${lo.toString(16)}) > hi (0x${hi.toString(16)})`,
        trace: [],
        tree: this.snapshot()
      };
    }

    const isSingleAddr = hi === 0;
    this.currentSyscall = isSingleAddr
      ? `munmap(0x${lo.toString(16)})`
      : `munmap(0x${lo.toString(16)}, 0x${hi.toString(16)})`;

    const trace: TraceStep[] = [];

    let curr = this.root;
    if (!curr) {
      return { success: false, error: "Root is null", trace, tree: null };
    }

    while (!curr.isLeaf) {
      this.recordStep(trace, "visit", curr.id, -1,
        `Traversing Node ${curr.id} to locate deletion target`,
        `Searching for VMA ${isSingleAddr ? `at 0x${lo.toString(16)}` : `range [0x${lo.toString(16)} - 0x${hi.toString(16)}]`} in interior Node ${curr.id}.`,
        "Walking the tree toward the target leaf.",
        [curr.id], -1);

      let slot: number = curr.pivots.length;
      for (let i = 0; i < curr.pivots.length; i++) {
        const pivot = curr.pivots[i];
        if (lo <= pivot) {
          slot = i;
          break;
        }
      }
      curr = curr.children[slot];
    }

    let idx = -1;
    for (let i = 0; i < curr.entries.length; i++) {
      const e = curr.entries[i];
      if (isSingleAddr) {
        if (lo >= e.lo && lo <= e.hi) {
          idx = i;
          break;
        }
      } else {
        if ((e.lo === lo && e.hi === hi) || !(hi < e.lo || lo > e.hi)) {
          idx = i;
          break;
        }
      }
    }

    if (idx === -1) {
      this.recordStep(trace, "not_found", curr.id, -1,
        "Deletion Target Not Found",
        `VMA ${isSingleAddr ? `at address 0x${lo.toString(16)}` : `with range [0x${lo.toString(16)} - 0x${hi.toString(16)}]`} does not exist in leaf Node ${curr.id}.`,
        "In Linux, unmapping a nonexistent range is a no-op.",
        [curr.id], -1);

      return {
        success: false,
        error: isSingleAddr
          ? `VMA at address 0x${lo.toString(16)} not found`
          : `VMA with range [0x${lo.toString(16)} - 0x${hi.toString(16)}] not found`,
        trace: trace,
        tree: this.snapshot()
      };
    }

    const target = curr.entries[idx];

    // Case 1: Middle hole punch (lo > target.lo && hi < target.hi && hi >= lo)
    if (!isSingleAddr && lo > target.lo && hi < target.hi && hi >= lo) {
      const baseLabel = target.label.replace(/^\[(.*)\]$/, '$1');
      const head: Entry = { lo: target.lo, hi: lo - 1, label: target.label.startsWith('[') ? `[${baseLabel}_head]` : `${baseLabel}_head` };
      const tail: Entry = { lo: hi + 1, hi: target.hi, label: target.label.startsWith('[') ? `[${baseLabel}_tail]` : `${baseLabel}_tail` };
      curr.entries.splice(idx, 1, head, tail);
      curr.updateLeafPivots();

      this.recordStep(trace, "delete", curr.id, idx,
        `Hole Punch: Split '${target.label}' into 2 VMAs`,
        `munmap(0x${lo.toString(16)}, 0x${hi.toString(16)}) carved a hole in '${target.label}' [0x${target.lo.toString(16)} - 0x${target.hi.toString(16)}], creating '${head.label}' [0x${head.lo.toString(16)} - 0x${head.hi.toString(16)}] and '${tail.label}' [0x${tail.lo.toString(16)} - 0x${tail.hi.toString(16)}].`,
        "In the Linux kernel mm, unmapping a middle sub-range splits the vm_area_struct into two. In the Maple Tree, replacing 1 entry with 2 can cause leaf overflow during munmap()!",
        [curr.id], idx);

      if (curr.entries.length > this.order) {
        curr.isOverflow = true;
        this.recordStep(trace, "overflow", curr.id, -1,
          `Munmap Overflow: Node ${curr.id} Exceeded Capacity (${curr.entries.length}/${this.order} slots)`,
          `Hole-punch split caused Node ${curr.id} to exceed capacity (${curr.entries.length} entries > ${this.order} max slots). Evaluating B* redistribution or split.`,
          "Counterintuitively, freeing memory via munmap() can trigger node allocation and tree growth when splitting VMAs.",
          [curr.id], -1);

        this.handleOverflow(curr, trace);
      } else {
        this.recomputeAncestorPivots(curr);
      }

      return {
        success: true,
        trace: trace,
        tree: this.snapshot()
      };
    }

    // Case 2: Prefix unmap (lo <= target.lo && hi < target.hi && hi >= target.lo)
    if (!isSingleAddr && lo <= target.lo && hi < target.hi && hi >= target.lo) {
      const oldLo = target.lo;
      target.lo = hi + 1;
      curr.updateLeafPivots();
      this.recomputeAncestorPivots(curr);

      this.recordStep(trace, "delete", curr.id, idx,
        `Prefix Unmap: Shrunk '${target.label}'`,
        `munmap(0x${lo.toString(16)}, 0x${hi.toString(16)}) unmapped prefix of '${target.label}'. Lower bound shifted from 0x${oldLo.toString(16)} to 0x${target.lo.toString(16)}.`,
        "Unmapping the prefix of a VMA adjusts the vm_start boundary without destroying the descriptor.",
        [curr.id], idx);

      return {
        success: true,
        trace: trace,
        tree: this.snapshot()
      };
    }

    // Case 3: Suffix unmap (lo > target.lo && hi >= target.hi && lo <= target.hi)
    if (!isSingleAddr && lo > target.lo && hi >= target.hi && lo <= target.hi) {
      const oldHi = target.hi;
      target.hi = lo - 1;
      curr.updateLeafPivots();
      this.recomputeAncestorPivots(curr);

      this.recordStep(trace, "delete", curr.id, idx,
        `Suffix Unmap: Shrunk '${target.label}'`,
        `munmap(0x${lo.toString(16)}, 0x${hi.toString(16)}) unmapped suffix of '${target.label}'. Upper bound shifted from 0x${oldHi.toString(16)} to 0x${target.hi.toString(16)}.`,
        "Unmapping the suffix of a VMA adjusts the vm_end boundary and updates leaf and ancestor pivots in place.",
        [curr.id], idx);

      return {
        success: true,
        trace: trace,
        tree: this.snapshot()
      };
    }

    // Case 4: Full deletion (isSingleAddr or unmap range encompasses the entire VMA)
    const removed = curr.entries[idx];
    curr.entries.splice(idx, 1);
    curr.updateLeafPivots();

    this.recordStep(trace, "delete", curr.id, idx,
      `Removed VMA '${removed.label}' from Node ${curr.id}`,
      `Deleted VMA '${removed.label}' [0x${removed.lo.toString(16)} - 0x${removed.hi.toString(16)}] from slot[${idx}] of Node ${curr.id}. Node now has ${curr.entries.length} entries.`,
      "Deleting a VMA frees virtual address space and compacts the leaf array.",
      [curr.id], -1);

    // Check underflow and collapse
    if (curr !== this.root && curr.entries.length === 0) {
      this.collapseUnderflow(curr, trace);
    } else {
      this.recomputeAncestorPivots(curr);
      this.checkRootCollapse(trace);
    }

    return {
      success: true,
      trace: trace,
      tree: this.snapshot()
    };
  }

  private collapseUnderflow(node: MapleNode, trace: TraceStep[]) {
    let curr: MapleNode | null = node;
    while (curr && curr !== this.root && curr.parent) {
      const parent: MapleNode = curr.parent;
      if (curr.isLeaf) {
        if (curr.entries.length === 0) {
          const idx = parent.children.indexOf(curr);
          if (idx !== -1) {
            parent.children.splice(idx, 1);
            this.recomputeInteriorPivots(parent);
            this.recomputeAncestorPivots(parent);
            this.recordStep(trace, "underflow", parent.id, -1,
              `Empty Leaf Node ${curr.id} Removed`,
              `Leaf Node ${curr.id} has 0 entries remaining. Unlinked from parent Node ${parent.id}.`,
              "In the Maple Tree, completely empty leaf ranges are unlinked and freed via RCU.",
              [parent.id], -1);
          }
          curr = parent;
          continue;
        }
      } else {
        // Interior node underflow
        if (curr.children.length === 0) {
          const idx = parent.children.indexOf(curr);
          if (idx !== -1) {
            parent.children.splice(idx, 1);
            this.recomputeInteriorPivots(parent);
            this.recomputeAncestorPivots(parent);
          }
          curr = parent;
          continue;
        } else if (curr.children.length === 1) {
          const onlyChild = curr.children[0];
          const idx = parent.children.indexOf(curr);
          if (idx !== -1) {
            parent.children[idx] = onlyChild;
            onlyChild.parent = parent;
            this.recomputeInteriorPivots(parent);
            this.recomputeAncestorPivots(parent);
            this.recordStep(trace, "collapse", onlyChild.id, -1,
              `Interior Node ${curr.id} Collapsed into Parent ${parent.id}`,
              `Node ${curr.id} had only 1 child (Node ${onlyChild.id}). Promoted child directly to parent Node ${parent.id}.`,
              "Eliminating single-child interior nodes ensures strict B-tree balance and minimal traversal depth.",
              [parent.id, onlyChild.id], -1);
          }
          curr = parent;
          continue;
        }
      }
      break;
    }

    this.checkRootCollapse(trace);
  }

  private checkRootCollapse(trace: TraceStep[]) {
    if (this.root && !this.root.isLeaf && this.root.children.length === 0) {
      this.root = this.newNode(true);
      return;
    }
    while (this.root && !this.root.isLeaf && this.root.children.length === 1) {
      const oldRootId = this.root.id;
      const newRoot = this.root.children[0];
      newRoot.parent = null;
      this.root = newRoot;

      this.recordStep(trace, "collapse", this.root.id, 0,
        `Root Collapse: Depth Reduced (Node ${oldRootId} -> Node ${this.root.id})`,
        `Root Node ${oldRootId} was left with only 1 child. Redundant root collapsed, promoting Node ${this.root.id} as new root.`,
        "When interior nodes empty out, the tree collapses levels downward to minimize traversal latency.",
        [this.root.id], -1);
    }
  }

  unmapRange(lo: number, hi: number): OperationResult {
    if (!isValidAddress(lo)) {
      return {
        success: false,
        error: `Invalid start address (lo): ${lo}. Must be a non-negative integer within canonical 48-bit address space (0x0 to 0x7fffffffffff).`,
        trace: [],
        tree: this.snapshot()
      };
    }
    if (!isValidAddress(hi)) {
      return {
        success: false,
        error: `Invalid end address (hi): ${hi}. Must be a non-negative integer within canonical 48-bit address space (0x0 to 0x7fffffffffff).`,
        trace: [],
        tree: this.snapshot()
      };
    }
    if (lo > hi) {
      return {
        success: false,
        error: `Invalid range: lo (0x${lo.toString(16)}) > hi (0x${hi.toString(16)})`,
        trace: [],
        tree: this.snapshot()
      };
    }
    return this.delete(lo, hi);
  }

  getSuccessorEntry(leaf: MapleNode, targetIdx: number): { entry: Entry; node: MapleNode; slotIdx: number } | null {
    if (targetIdx + 1 < leaf.entries.length) {
      return { entry: leaf.entries[targetIdx + 1], node: leaf, slotIdx: targetIdx + 1 };
    }

    // Ascend parent chain to find an ancestor where we came from a child that has a right sibling
    let curr: MapleNode = leaf;
    while (curr.parent) {
      const parent: MapleNode = curr.parent;
      const childIdx = parent.children.indexOf(curr);
      if (childIdx !== -1 && childIdx + 1 < parent.children.length) {
        // Next sibling subtree found. Now descend leftmost until reaching a leaf.
        let nextSubtree: MapleNode = parent.children[childIdx + 1];
        while (!nextSubtree.isLeaf) {
          nextSubtree = nextSubtree.children[0];
        }
        if (nextSubtree.entries.length > 0) {
          return { entry: nextSubtree.entries[0], node: nextSubtree, slotIdx: 0 };
        }
      }
      curr = parent;
    }

    return null;
  }

  brk(newBrk: number): OperationResult {
    if (!isValidAddress(newBrk)) {
      return {
        success: false,
        error: `Invalid brk boundary: ${newBrk}. Must be a non-negative integer within canonical 48-bit address space (0x0 to 0x7fffffffffff).`,
        trace: [],
        tree: this.snapshot()
      };
    }

    this.currentSyscall = `brk(0x${newBrk.toString(16)})`;
    const trace: TraceStep[] = [];
    let curr = this.root;
    if (!curr) {
      return { success: false, error: "Root is null", trace, tree: null };
    }

    // Find the heap entry
    let targetLeaf: MapleNode | null = null;
    let targetIdx = -1;

    const findHeap = (n: MapleNode) => {
      if (n.isLeaf) {
        for (let i = 0; i < n.entries.length; i++) {
          if (n.entries[i].label.toLowerCase().includes("heap")) {
            targetLeaf = n;
            targetIdx = i;
            return;
          }
        }
      } else {
        for (const child of n.children) {
          findHeap(child);
          if (targetLeaf) return;
        }
      }
    };
    findHeap(curr);

    if (!targetLeaf || targetIdx === -1) {
      return {
        success: false,
        error: "No [heap] VMA found for brk() adjustment",
        trace,
        tree: this.snapshot()
      };
    }

    const leaf: MapleNode = targetLeaf;
    const entry = leaf.entries[targetIdx];
    const oldHi = entry.hi;

    this.recordStep(trace, "visit", leaf.id, targetIdx,
      `Inspecting [heap] VMA at Node ${leaf.id}`,
      `Current heap boundaries: [0x${entry.lo.toString(16)} - 0x${oldHi.toString(16)}]. Requested brk: 0x${newBrk.toString(16)}.`,
      "sys_brk() checks current mm->brk and adjusts the heap end boundary.",
      [leaf.id], targetIdx);

    if (newBrk === oldHi) {
      return { success: true, trace, tree: this.snapshot() };
    }

    if (newBrk < entry.lo) {
      this.recordStep(trace, "conflict", leaf.id, targetIdx,
        "sys_brk(): Invalid Boundary",
        `Requested brk 0x${newBrk.toString(16)} is below heap start boundary 0x${entry.lo.toString(16)}. Kernel denies heap contraction below start_brk.`,
        "sys_brk() strictly validates that the break cannot be moved below mm->start_brk.",
        [leaf.id], targetIdx);
      return {
        success: false,
        error: `Cannot contract heap below start boundary (0x${entry.lo.toString(16)})`,
        trace,
        tree: this.snapshot()
      };
    }

    const isExpand = newBrk > oldHi;

    // Check collision with next in-order VMA (same leaf or adjacent subtree)
    if (isExpand) {
      const successor = this.getSuccessorEntry(leaf, targetIdx);
      if (successor && newBrk >= successor.entry.lo) {
        const nextEntry = successor.entry;
        const conflictNode = successor.node;
        const conflictSlot = successor.slotIdx;
        this.recordStep(trace, "conflict", conflictNode.id, conflictSlot,
          `sys_brk(): Range Conflict with '${nextEntry.label}'`,
          `Expanding heap to 0x${newBrk.toString(16)} collides with existing VMA '${nextEntry.label}' [0x${nextEntry.lo.toString(16)} - 0x${nextEntry.hi.toString(16)}].`,
          "sys_brk() returns -ENOMEM if the requested break boundary overlaps an existing VMA mapping.",
          [leaf.id, conflictNode.id], conflictSlot);
        return {
          success: false,
          error: `Heap expansion to 0x${newBrk.toString(16)} overlaps with '${nextEntry.label}' [0x${nextEntry.lo.toString(16)} - 0x${nextEntry.hi.toString(16)}]`,
          trace,
          tree: this.snapshot()
        };
      }
    }

    entry.hi = newBrk;
    leaf.updateLeafPivots();
    this.recomputeAncestorPivots(leaf);

    const deltaBytes = Math.abs(newBrk - oldHi);
    const deltaKb = (deltaBytes / 1024).toFixed(0);

    if (isExpand) {
      this.recordStep(trace, "insert", leaf.id, targetIdx,
        `sys_brk(0x${newBrk.toString(16)}): Heap Expanded (+${deltaKb} KB)`,
        `Expanded heap upper boundary from 0x${oldHi.toString(16)} to 0x${newBrk.toString(16)} (+${deltaKb} KB). Updated boundary pivot in leaf Node ${leaf.id} in place.`,
        "In Linux, expanding the heap via brk() shifts the VMA end boundary without allocating a new VMA or tree node, updating the Maple Tree pivot in place.",
        [leaf.id], targetIdx);
    } else {
      this.recordStep(trace, "delete", leaf.id, targetIdx,
        `sys_brk(0x${newBrk.toString(16)}): Heap Compacted (-${deltaKb} KB)`,
        `Compacted heap upper boundary downward from 0x${oldHi.toString(16)} to 0x${newBrk.toString(16)} (-${deltaKb} KB). Updated boundary pivot in leaf Node ${leaf.id}.`,
        "Contracting the heap releases unused virtual address space back to the kernel, immediately lowering the leaf pivot boundary.",
        [leaf.id], targetIdx);
    }

    return {
      success: true,
      trace,
      tree: this.snapshot()
    };
  }

  mprotect(lo: number, hi: number, newLabel: string): OperationResult {
    if (!isValidAddress(lo)) {
      return {
        success: false,
        error: `Invalid start address (lo): ${lo}. Must be a non-negative integer within canonical 48-bit address space (0x0 to 0x7fffffffffff).`,
        trace: [],
        tree: this.snapshot()
      };
    }
    if (!isValidAddress(hi)) {
      return {
        success: false,
        error: `Invalid end address (hi): ${hi}. Must be a non-negative integer within canonical 48-bit address space (0x0 to 0x7fffffffffff).`,
        trace: [],
        tree: this.snapshot()
      };
    }
    if (lo > hi) {
      return {
        success: false,
        error: `Invalid range: lo (0x${lo.toString(16)}) > hi (0x${hi.toString(16)})`,
        trace: [],
        tree: this.snapshot()
      };
    }
    if (typeof newLabel !== 'string' || !newLabel.trim()) {
      return {
        success: false,
        error: `Invalid protection label: ${newLabel}. Must be a non-empty string.`,
        trace: [],
        tree: this.snapshot()
      };
    }

    this.currentSyscall = `mprotect(0x${lo.toString(16)}, 0x${hi.toString(16)}, "${newLabel}")`;
    const trace: TraceStep[] = [];

    let curr = this.root;
    if (!curr) {
      return { success: false, error: "Root is null", trace, tree: null };
    }

    // Traverse down to target leaf using mas_walk
    while (!curr.isLeaf) {
      let slot: number = curr.pivots.length;
      for (let i = 0; i < curr.pivots.length; i++) {
        if (lo <= curr.pivots[i]) {
          slot = i;
          break;
        }
      }
      curr = curr.children[slot];
    }

    let targetIdx = -1;
    for (let i = 0; i < curr.entries.length; i++) {
      const e = curr.entries[i];
      if (lo >= e.lo && hi <= e.hi) {
        targetIdx = i;
        break;
      }
    }

    if (targetIdx === -1) {
      return {
        success: false,
        error: `No VMA covering range [0x${lo.toString(16)} - 0x${hi.toString(16)}] found for mprotect`,
        trace,
        tree: this.snapshot()
      };
    }

    const target = curr.entries[targetIdx];
    this.recordStep(trace, "visit", curr.id, targetIdx,
      `Inspecting VMA '${target.label}' for mprotect`,
      `Evaluating protection change on [0x${lo.toString(16)} - 0x${hi.toString(16)}] within '${target.label}' [0x${target.lo.toString(16)} - 0x${target.hi.toString(16)}].`,
      "sys_mprotect() modifies page table protection flags (PROT_READ, PROT_WRITE, PROT_EXEC).",
      [curr.id], targetIdx);

    if (lo === target.lo && hi < target.hi) {
      const remainingLabel = target.label.includes("jit_arena")
        ? "[jit_data: rw-]"
        : target.label.replace("rw-", "rw- [data]");
      const protectedPart: Entry = { lo: target.lo, hi: hi, label: newLabel };
      const remainingPart: Entry = {
        lo: hi + 1,
        hi: target.hi,
        label: remainingLabel
      };
      curr.entries.splice(targetIdx, 1, protectedPart, remainingPart);
      curr.updateLeafPivots();

      this.recordStep(trace, "insert", curr.id, targetIdx,
        `mprotect: Split VMA to Enforce W^X Security`,
        `Split '${target.label}' into '${protectedPart.label}' [0x${protectedPart.lo.toString(16)} - 0x${protectedPart.hi.toString(16)}] and '${remainingPart.label}' [0x${remainingPart.lo.toString(16)} - 0x${remainingPart.hi.toString(16)}].`,
        "W^X (Write XOR Execute) security policy strictly forbids pages from being simultaneously writable and executable. The kernel mm splits the VMA to assign distinct PTE protection bits.",
        [curr.id], targetIdx);

      while (curr.entries.length > this.order) {
        curr.isOverflow = true;
        this.handleOverflow(curr, trace);
      }
      this.recomputeAncestorPivots(curr);
    } else if (lo > target.lo && hi === target.hi) {
      const remainingPart: Entry = { lo: target.lo, hi: lo - 1, label: target.label };
      const protectedPart: Entry = { lo: lo, hi: hi, label: newLabel };
      curr.entries.splice(targetIdx, 1, remainingPart, protectedPart);
      curr.updateLeafPivots();

      this.recordStep(trace, "insert", curr.id, targetIdx + 1,
        `mprotect: Split VMA Suffix for W^X Security`,
        `Split '${target.label}' into '${remainingPart.label}' [0x${remainingPart.lo.toString(16)} - 0x${remainingPart.hi.toString(16)}] and '${protectedPart.label}' [0x${protectedPart.lo.toString(16)} - 0x${protectedPart.hi.toString(16)}].`,
        "Kernel mm splits VMA on boundary protection changes.",
        [curr.id], targetIdx + 1);

      while (curr.entries.length > this.order) {
        curr.isOverflow = true;
        this.handleOverflow(curr, trace);
      }
      this.recomputeAncestorPivots(curr);
    } else if (lo > target.lo && hi < target.hi) {
      const headPart: Entry = { lo: target.lo, hi: lo - 1, label: target.label };
      const midPart: Entry = { lo: lo, hi: hi, label: newLabel };
      const tailPart: Entry = { lo: hi + 1, hi: target.hi, label: target.label };
      curr.entries.splice(targetIdx, 1, headPart, midPart, tailPart);
      curr.updateLeafPivots();

      this.recordStep(trace, "insert", curr.id, targetIdx + 1,
        `mprotect: Split VMA Middle Sub-Range`,
        `Carved '${midPart.label}' [0x${midPart.lo.toString(16)} - 0x${midPart.hi.toString(16)}] out of '${target.label}'.`,
        "Kernel mm splits VMA into three pieces when modifying middle sub-range permissions.",
        [curr.id], targetIdx + 1);

      while (curr.entries.length > this.order) {
        curr.isOverflow = true;
        this.handleOverflow(curr, trace);
      }
      this.recomputeAncestorPivots(curr);
    } else {
      target.label = newLabel;
      this.recordStep(trace, "insert", curr.id, targetIdx,
        `mprotect: Updated Protection on '${target.label}'`,
        `Updated protection flags for '${target.label}' [0x${target.lo.toString(16)} - 0x${target.hi.toString(16)}].`,
        "Updated VMA protection attributes in place.",
        [curr.id], targetIdx);
    }

    return {
      success: true,
      trace,
      tree: this.snapshot()
    };
  }

  reset(order: number): OperationResult {
    if (!Number.isSafeInteger(order) || order < 3) {
      order = 4;
    }
    if (order > 16) {
      order = 16;
    }
    this.order = order;
    this.nextId = 1;
    this.currentSyscall = `mt_init(order=${this.order})`;
    this.root = this.newNode(true);

    const trace: TraceStep[] = [];
    this.recordStep(trace, "visit", this.root.id, -1,
      `Maple Tree Initialized (Order ${this.order})`,
      `Created fresh root Leaf Node ${this.root.id} with maximum capacity of ${this.order} slots.`,
      "At process creation (execve), mm->mm_mt is initialized with an empty root representing the entire 64-bit address space.",
      [this.root.id], -1);

    return {
      success: true,
      trace: trace,
      tree: this.snapshot()
    };
  }

  /**
   * ARCHITECTURAL DESIGN RATIONALE: Leaf Redistribution vs. Interior RCU Node Splitting
   *
   * In a classical B* tree, overflowed nodes attempt to balance or redistribute entries
   * into adjacent siblings (push-left or push-right) before committing to a costly node split.
   * In this Maple Tree engine (and mirroring Linux kernel `lib/maple_tree.c`),
   * B* sibling redistribution is applied EXCLUSIVELY to leaf nodes, whereas interior node
   * overflow immediately falls back to copy-on-write RCU node splitting (`splitNode`).
   *
   * Design Rationale & Linux Kernel RCU Copy-on-Write Semantics:
   * 1. Leaf Density & Allocation Churn:
   *    In Linux virtual memory management (`mm_struct`), leaf nodes store `vm_area_struct`
   *    mappings. Address space operations frequently create, resize, or extend adjacent VMAs
   *    (e.g., brk expansion, mmap growth). Redistributing entries among sibling leaves maintains
   *    high node packing density (typically >80% fill factor) and prevents excessive 256-byte
   *    node allocation and free churn for localized mapping adjustments.
   *
   * 2. RCU Lockless Reader Safety (`mas_walk` / Copy-on-Write):
   *    The Maple Tree is specifically engineered for concurrent, lockless read traversal
   *    under RCU (Read-Copy-Update), such as lockless page-fault handling without acquiring
   *    `mmap_lock` for reads. Interior nodes store pivots and child pointers that form the
   *    hierarchical routing backbone traversed by lockless readers.
   *    - If an interior node were to redistribute child pointers and pivots across siblings in place,
   *      a concurrent RCU reader descending the tree could observe transient pivot states,
   *      inconsistent routing intervals, or temporarily orphaned subtrees unless an expensive,
   *      multi-node synchronized locking scheme were held across all ancestor siblings.
   *    - In Linux kernel `lib/maple_tree.c` (`mas_split_node` / `mas_node_split`), structural changes
   *      to interior routing nodes instead follow strict RCU copy-on-write semantics: new interior
   *      nodes are allocated and populated out-of-line, and the parent pivot/pointer update is
   *      published atomically via `rcu_assign_pointer()`. Concurrent readers are guaranteed to
   *      observe either the old valid routing snapshot or the new valid routing snapshot,
   *      never a partially shifted or mutated interior node.
   *
   * 3. Sibling Saturation & Fallback:
   *    When both left and right siblings of a leaf node are 100% full (double-sibling saturation),
   *    or when the overflowing node is an interior routing node, the tree falls back to `splitNode()`.
   */
  handleOverflow(node: MapleNode, trace: TraceStep[]) {
    // First: Try sibling redistribution (push left / push right)
    if (node.parent) {
      const parent = node.parent;
      let nodeIdx = -1;
      for (let i = 0; i < parent.children.length; i++) {
        if (parent.children[i] === node) {
          nodeIdx = i;
          break;
        }
      }

      // Try Push Left
      let leftFull = false;
      if (nodeIdx > 0) {
        const leftSibling = parent.children[nodeIdx - 1];
        let leftCount = leftSibling.isLeaf ? leftSibling.entries.length : leftSibling.children.length;
        if (leftCount < this.order) {
          if (node.isLeaf) {
            const shifted = node.entries[0];
            node.entries.shift();
            leftSibling.entries.push(shifted);
            node.updateLeafPivots();
            leftSibling.updateLeafPivots();
            node.isOverflow = false;
            this.recomputeAncestorPivots(leftSibling);
            this.recomputeAncestorPivots(node);

            this.recordStep(trace, "split_redistribute", node.id, 0,
              `B* Push-Left Redistribution (Node ${node.id} -> Node ${leftSibling.id})`,
              `Node ${node.id} was full. Shifted lowest entry '${shifted.label}' [0x${shifted.lo.toString(16)} - 0x${shifted.hi.toString(16)}] to left sibling Node ${leftSibling.id}. Updated parent pivot.`,
              "Redistributing across siblings keeps nodes dense without incurring the memory and RCU overhead of allocating a new 256-byte node.",
              [node.id, leftSibling.id, parent.id], -1);
            return;
          }
        } else {
          leftFull = true;
        }
      }

      // Try Push Right
      let rightFull = false;
      if (nodeIdx < parent.children.length - 1) {
        const rightSibling = parent.children[nodeIdx + 1];
        let rightCount = rightSibling.isLeaf ? rightSibling.entries.length : rightSibling.children.length;
        if (rightCount < this.order) {
          if (node.isLeaf) {
            const shifted = node.entries[node.entries.length - 1];
            node.entries.pop();
            rightSibling.entries.unshift(shifted);
            node.updateLeafPivots();
            rightSibling.updateLeafPivots();
            node.isOverflow = false;
            this.recomputeAncestorPivots(node);
            this.recomputeAncestorPivots(rightSibling);

            this.recordStep(trace, "split_redistribute", node.id, node.entries.length - 1,
              `B* Push-Right Redistribution (Node ${node.id} -> Node ${rightSibling.id})`,
              `Node ${node.id} was full. Shifted highest entry '${shifted.label}' [0x${shifted.lo.toString(16)} - 0x${shifted.hi.toString(16)}] to right sibling Node ${rightSibling.id}. Updated parent pivot.`,
              "Push-right balances the load between adjacent subtrees.",
              [node.id, rightSibling.id, parent.id], -1);
            return;
          }
        } else {
          rightFull = true;
        }
      }

      if (leftFull && rightFull) {
        const leftSib = parent.children[nodeIdx - 1];
        const rightSib = parent.children[nodeIdx + 1];
        const leftCount = leftSib.isLeaf ? leftSib.entries.length : leftSib.children.length;
        const rightCount = rightSib.isLeaf ? rightSib.entries.length : rightSib.children.length;
        this.recordStep(trace, "overflow", node.id, -1,
          `Double-Sibling Saturation: Redistribution Blocked`,
          `Node ${node.id} cannot redistribute: left sibling Node ${leftSib.id} (${leftCount}/${this.order}) and right sibling Node ${rightSib.id} (${rightCount}/${this.order}) are both 100% saturated. Rejecting redistribution and forcing RCU split.`,
          "When all adjacent siblings are saturated, B* trees fall back to RCU node splitting, allocating a new 256-byte node.",
          [node.id, leftSib.id, rightSib.id], -1);
      }
    }

    // Siblings are full or no siblings -> Node Split
    this.splitNode(node, trace);
  }

  splitNode(node: MapleNode, trace: TraceStep[]) {
    node.isOverflow = false;
    const newNode = this.newNode(node.isLeaf);
    newNode.parent = node.parent;

    let separatorPivot = 0;

    if (node.isLeaf) {
      const mid = Math.floor(node.entries.length / 2);
      newNode.entries.push(...node.entries.slice(mid));
      node.entries = node.entries.slice(0, mid);

      node.updateLeafPivots();
      newNode.updateLeafPivots();

      separatorPivot = node.entries[node.entries.length - 1].hi;
    } else {
      const mid = Math.floor(node.children.length / 2);
      newNode.children.push(...node.children.slice(mid));
      for (const c of newNode.children) {
        c.parent = newNode;
      }
      node.children = node.children.slice(0, mid);

      separatorPivot = node.pivots[mid - 1];

      newNode.pivots.push(...node.pivots.slice(mid));
      node.pivots = node.pivots.slice(0, mid - 1);
    }

    // If root is splitting, create new root
    if (node === this.root) {
      const newRoot = this.newNode(false);
      newRoot.children = [node, newNode];
      newRoot.pivots = [separatorPivot];
      node.parent = newRoot;
      newNode.parent = newRoot;
      this.root = newRoot;

      this.recordStep(trace, "split", newRoot.id, 0,
        `Root Split: Tree Depth Increased (Node ${newRoot.id} is New Root)`,
        `Root Node ${node.id} split 50/50. Created new interior root Node ${newRoot.id} with separator pivot 0x${separatorPivot.toString(16)} pointing to Node ${node.id} and Node ${newNode.id}.`,
        "Root splits increase overall tree depth by 1. Because the Maple Tree has a high branching factor, depth rarely exceeds 4 even for 50,000 VMAs.",
        [newRoot.id, node.id, newNode.id], -1);
      return;
    }

    // Insert separator and newNode into parent
    const parent = node.parent!;
    let insertIdx = parent.children.length;
    for (let i = 0; i < parent.children.length; i++) {
      if (parent.children[i] === node) {
        insertIdx = i + 1;
        break;
      }
    }

    parent.children.splice(insertIdx, 0, newNode);
    this.recomputeInteriorPivots(parent);

    this.recordStep(trace, "split", parent.id, insertIdx - 1,
      `Split Node ${node.id} -> Created Node ${newNode.id} (Pushed Pivot 0x${separatorPivot.toString(16)})`,
      `Split Node ${node.id} into two halves. Promoted separator pivot 0x${separatorPivot.toString(16)} to parent Node ${parent.id}.`,
      "Under RCU, node replacement creates new copies and atomically updates the parent slot pointer, scheduling obsolete nodes for delayed freeing via call_rcu().",
      [parent.id, node.id, newNode.id], insertIdx - 1);

    if (parent.children.length > this.order) {
      parent.isOverflow = true;
      this.recordStep(trace, "overflow", parent.id, -1,
        `Parent Node ${parent.id} Overflow Detected (${parent.children.length}/${this.order} slots)`,
        `Parent Node ${parent.id} now exceeds capacity after receiving child Node ${newNode.id}.`,
        "Cascading splits propagate upward toward the root.",
        [parent.id], -1);

      this.handleOverflow(parent, trace);
    }
  }

  recomputeInteriorPivots(n: MapleNode) {
    if (n.isLeaf || n.children.length <= 1) {
      n.pivots = [];
      return;
    }
    n.pivots = new Array(n.children.length - 1);
    for (let i = 0; i < n.children.length - 1; i++) {
      n.pivots[i] = this.maxBoundOfSubtree(n.children[i]);
    }
  }

  maxBoundOfSubtree(n: MapleNode): number {
    let curr = n;
    while (!curr.isLeaf) {
      curr = curr.children[curr.children.length - 1];
    }
    if (curr.entries.length === 0) {
      return 0;
    }
    return curr.entries[curr.entries.length - 1].hi;
  }

  recomputeAncestorPivots(n: MapleNode) {
    let curr = n.parent;
    while (curr) {
      this.recomputeInteriorPivots(curr);
      curr = curr.parent;
    }
  }

  checkInvariants(): Error | null {
    if (!this.root) {
      return new Error("root is null");
    }
    return this.validateNode(this.root, null, 0, MAX_SAFE_VADDR);
  }

  validateNode(n: MapleNode, expectedParent: MapleNode | null, minBound: number, maxBound: number): Error | null {
    if (n.parent !== expectedParent) {
      return new Error(`node ${n.id}: parent mismatch`);
    }

    // Assert node capacity bounds
    if (n.isLeaf && n.entries.length > this.order) {
      return new Error(`leaf node ${n.id}: entries count ${n.entries.length} exceeds capacity ${this.order}`);
    }
    if (!n.isLeaf && n.children.length > this.order) {
      return new Error(`interior node ${n.id}: children count ${n.children.length} exceeds capacity ${this.order}`);
    }

    // Verify pivot ordering
    for (let i = 1; i < n.pivots.length; i++) {
      if (n.pivots[i] <= n.pivots[i - 1]) {
        return new Error(`node ${n.id}: pivots not strictly increasing (pivot[${i}]=0x${n.pivots[i].toString(16)} <= pivot[${i - 1}]=0x${n.pivots[i - 1].toString(16)})`);
      }
    }

    if (n.isLeaf) {
      if (n.children.length !== 0) {
        return new Error(`leaf node ${n.id} has children`);
      }
      if (n.entries.length > 1 && n.pivots.length !== n.entries.length - 1) {
        return new Error(`leaf node ${n.id}: pivot count ${n.pivots.length} != entries-1 (${n.entries.length - 1})`);
      }
      // Verify entries sorted and non-overlapping
      for (let i = 0; i < n.entries.length; i++) {
        if (n.entries[i].lo > n.entries[i].hi) {
          return new Error(`leaf node ${n.id}: entry[${i}] inverted lo=0x${n.entries[i].lo.toString(16)} > hi=0x${n.entries[i].hi.toString(16)}`);
        }
        if (i > 0 && n.entries[i].lo <= n.entries[i - 1].hi) {
          return new Error(`leaf node ${n.id}: entry[${i}] overlaps with entry[${i - 1}]`);
        }
      }
      // Assert leaf entries against minBound and maxBound
      if (n.entries.length > 0) {
        if (n.entries[0].lo < minBound) {
          return new Error(`leaf node ${n.id}: entry[0].lo (0x${n.entries[0].lo.toString(16)}) < minBound (0x${minBound.toString(16)})`);
        }
        if (n.entries[n.entries.length - 1].hi > maxBound) {
          return new Error(`leaf node ${n.id}: entry[${n.entries.length - 1}].hi (0x${n.entries[n.entries.length - 1].hi.toString(16)}) > maxBound (0x${maxBound.toString(16)})`);
        }
      }
    } else {
      if (n.entries.length !== 0) {
        return new Error(`interior node ${n.id} has entries`);
      }
      if (n.children.length === 0) {
        return new Error(`interior node ${n.id} has 0 children`);
      }
      if (n.children.length <= 1 && n !== this.root) {
        return new Error(`interior non-root node ${n.id} has <= 1 children`);
      }
      if (n.children.length === 1 && n === this.root) {
        return new Error(`interior root node ${n.id} has only 1 child (should collapse)`);
      }
      if (n.children.length > 1 && n.pivots.length !== n.children.length - 1) {
        return new Error(`interior node ${n.id}: pivot count ${n.pivots.length} != children-1 (${n.children.length - 1})`);
      }
      // Assert interior node pivots against subtree maximums
      for (let i = 0; i < n.pivots.length; i++) {
        const expected = this.maxBoundOfSubtree(n.children[i]);
        if (n.pivots[i] !== expected) {
          return new Error(`interior node ${n.id}: pivot[${i}]=0x${n.pivots[i].toString(16)} != maxBoundOfSubtree(child[${i}])=0x${expected.toString(16)}`);
        }
      }
      for (let i = 0; i < n.children.length; i++) {
        const child = n.children[i];
        let childMin = minBound;
        if (i > 0) {
          childMin = n.pivots[i - 1] + 1;
        }
        let childMax = maxBound;
        if (i < n.pivots.length) {
          childMax = n.pivots[i];
        }
        const err = this.validateNode(child, n, childMin, childMax);
        if (err) {
          return err;
        }
      }
    }
    return null;
  }
}
