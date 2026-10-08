import { MapleTree } from './tree';
import { OperationResult, TraceStep } from './types';

// ============================================================================
// Track 1: 🏛️ Core B-Tree & Maple Tree Mechanics (CS Algorithms)
// ============================================================================

export function loadSplitDemo(tree: MapleTree): OperationResult {
  tree.reset(4);
  const items = [
    { lo: 0x1000, hi: 0x2000, label: "[text]" },
    { lo: 0x3000, hi: 0x4000, label: "[rodata]" },
    { lo: 0x5000, hi: 0x6000, label: "[data]" },
    { lo: 0x7000, hi: 0x8000, label: "[heap]" },
    { lo: 0x9000, hi: 0xa000, label: "[anon1]" }, // triggers split
  ];
  const allTrace: TraceStep[] = [];
  for (const item of items) {
    const res = tree.insert(item.lo, item.hi, item.label);
    allTrace.push(...res.trace);
  }
  return {
    success: true,
    trace: allTrace,
    tree: tree.snapshot()
  };
}

export function loadRedistributeDemo(tree: MapleTree): OperationResult {
  tree.reset(4);
  const items = [
    { lo: 0x1000, hi: 0x2000, label: "[text]" },
    { lo: 0x3000, hi: 0x4000, label: "[rodata]" },
    { lo: 0x5000, hi: 0x6000, label: "[data]" },
    { lo: 0x7000, hi: 0x8000, label: "[heap]" },
    { lo: 0x9000, hi: 0xa000, label: "[anon1]" }, // causes split into left (2) and right (3)
    { lo: 0xb000, hi: 0xc000, label: "[anon2]" }, // fills right child (4)
    { lo: 0xd000, hi: 0xe000, label: "[anon3]" }, // right child overfilled -> triggers push-left redistribution!
  ];
  const allTrace: TraceStep[] = [];
  for (const item of items) {
    const res = tree.insert(item.lo, item.hi, item.label);
    allTrace.push(...res.trace);
  }

  // Demonstrate Push-Right as well:
  // Right child currently has [heap, anon1, anon2, anon3] (4 entries)
  // Delete anon3 from right child -> right child has 3 entries
  const delRes = tree.delete(0xd000, 0xe000);
  allTrace.push(...delRes.trace);

  // Now insert into left child to cause left child to overflow and push-right into right child
  const l1 = tree.insert(0x0200, 0x0800, "[init]");
  allTrace.push(...l1.trace);
  const l2 = tree.insert(0x0050, 0x0150, "[boot]");
  allTrace.push(...l2.trace);

  return {
    success: true,
    trace: allTrace,
    tree: tree.snapshot()
  };
}

export function loadSaturationDemo(tree: MapleTree): OperationResult {
  tree.reset(4);
  const allTrace: TraceStep[] = [];
  // 1. Initial 4 items to fill root leaf
  const setup = [
    { lo: 0x1000, hi: 0x1800, label: "[mod_a1]" },
    { lo: 0x2000, hi: 0x2800, label: "[mod_a2]" },
    { lo: 0x3000, hi: 0x3800, label: "[mod_a3]" },
    { lo: 0x4000, hi: 0x4800, label: "[mod_a4]" },
    // 5th item causes root split into 2 leaves: left (2) and right (3)
    { lo: 0x5000, hi: 0x5400, label: "[mod_b1]" },
    // Add to right child to fill and cause push-left into left child
    { lo: 0x6000, hi: 0x6800, label: "[mod_b2]" }, // right has 4
    { lo: 0x7000, hi: 0x7800, label: "[mod_b3]" }, // right has 5 -> pushes left! left now 3, right 4
    { lo: 0x8000, hi: 0x8800, label: "[mod_c1]" }, // right has 5 -> pushes left! left now 4 (full!), right 4
    { lo: 0x9000, hi: 0x9800, label: "[mod_c2]" }, // right has 5 -> left is full! right splits -> creates 3rd child!
    // Now root has 3 children:
    // Child 0: 4 entries (full)
    // Child 1: 2 entries
    // Child 2: 3 entries
    // Fill Child 2 to 4 entries:
    { lo: 0xa000, hi: 0xa800, label: "[mod_c3]" }, // Child 2 has 4 (full!)
    // Fill Child 1 to 4 entries:
    { lo: 0x5500, hi: 0x5800, label: "[mod_b1_sub]" }, // Child 1 has 3
    { lo: 0x5900, hi: 0x5c00, label: "[mod_b2_sub]" }, // Child 1 has 4 (full!)
  ];

  for (const item of setup) {
    const res = tree.insert(item.lo, item.hi, item.label);
    allTrace.push(...res.trace);
  }

  // At this point:
  // Child 0 has 4 entries (100% full)
  // Child 1 has 4 entries (100% full)
  // Child 2 has 4 entries (100% full)
  // Inserting into Child 1 (0x5d00..0x5e00) checks left [full] and right [full],
  // rejecting redistribution and forcing an RCU split!
  const trigger = tree.insert(0x5d00, 0x5e00, "[saturated_split]");
  allTrace.push(...trigger.trace);

  return {
    success: true,
    trace: allTrace,
    tree: tree.snapshot()
  };
}

export function loadCascadeSplitDemo(tree: MapleTree): OperationResult {
  // Cascading multi-level split using Order 3
  tree.reset(3);
  const allTrace: TraceStep[] = [];
  for (let i = 0; i < 10; i++) {
    const lo = i * 0x2000;
    const hi = lo + 0x1000;
    const res = tree.insert(lo, hi, `vma_${i}`);
    allTrace.push(...res.trace);
  }

  // Verification lookup in the newly allocated 3-level tree
  const searchRes = tree.search(0x12500);
  allTrace.push(...searchRes.trace);

  return {
    success: true,
    trace: allTrace,
    tree: tree.snapshot()
  };
}

export function loadDeleteDemo(tree: MapleTree): OperationResult {
  tree.reset(4);
  const items = [
    { lo: 0x1000, hi: 0x2000, label: "[text]" },
    { lo: 0x3000, hi: 0x4000, label: "[rodata]" },
    { lo: 0x5000, hi: 0x6000, label: "[data]" },
    { lo: 0x7000, hi: 0x8000, label: "[heap]" },
    { lo: 0x9000, hi: 0xa000, label: "[anon1]" }, // split to 2 levels
  ];
  const allTrace: TraceStep[] = [];
  for (const item of items) {
    const res = tree.insert(item.lo, item.hi, item.label);
    allTrace.push(...res.trace);
  }
  const d1 = tree.delete(0x5000, 0x6000);
  allTrace.push(...d1.trace);
  const d2 = tree.delete(0x7000, 0x8000);
  allTrace.push(...d2.trace);
  const d3 = tree.delete(0x9000, 0xa000);
  allTrace.push(...d3.trace);
  return {
    success: true,
    trace: allTrace,
    tree: tree.snapshot()
  };
}

// ============================================================================
// Track 2: 🐧 Linux Virtual Memory Subsystem (Kernel MM Realism)
// ============================================================================

/**
 * Preset 6: Linux 64-bit ELF Process Address Space
 * Represents canonical 48-bit user virtual address space (0x0 to 0x7fffffffffff = 128 TB).
 * High-address mappings include user stack and the legacy [vsyscall] page at the top of canonical 48-bit user space.
 * Note: Kernel mm munmap() in this visualizer operates on single VMAs or sub-ranges; tearing down multiple VMAs spans sequential unmapping.
 */
export function loadProcessVmas(tree: MapleTree): OperationResult {
  tree.reset(4);
  const vmas = [
    { lo: 0x00400000, hi: 0x00400fff, label: "[text]" },
    { lo: 0x00401000, hi: 0x00401fff, label: "[rodata]" },
    { lo: 0x00600000, hi: 0x00600fff, label: "[data]" },
    { lo: 0x00601000, hi: 0x00601fff, label: "[bss]" },
    { lo: 0x00800000, hi: 0x008fffff, label: "[heap]" },
    { lo: 0x7f0000000000, hi: 0x7f00001fffff, label: "libc.so" },
    { lo: 0x7f0000200000, hi: 0x7f00002fffff, label: "ld.so" },
    { lo: 0x7ffffffde000, hi: 0x7fffffffe000, label: "[stack]" },
    { lo: 0x7ffffffff000, hi: 0x7fffffffffff, label: "[vsyscall]" },
  ];

  const allTrace: TraceStep[] = [];
  for (const v of vmas) {
    const res = tree.insert(v.lo, v.hi, v.label);
    allTrace.push(...res.trace);
  }

  return {
    success: true,
    trace: allTrace,
    tree: tree.snapshot()
  };
}

export function loadPageFaultDemo(tree: MapleTree): OperationResult {
  tree.reset(4);
  const vmas = [
    { lo: 0x00400000, hi: 0x00400fff, label: "[text]" },
    { lo: 0x00401000, hi: 0x00401fff, label: "[rodata]" },
    { lo: 0x00600000, hi: 0x00600fff, label: "[data]" },
    { lo: 0x00601000, hi: 0x00601fff, label: "[bss]" },
    { lo: 0x00800000, hi: 0x008fffff, label: "[heap]" },
    { lo: 0x7f0000000000, hi: 0x7f00001fffff, label: "libc.so" },
    { lo: 0x7ffffffde000, hi: 0x7ffffffff000, label: "[stack]" },
  ];

  const allTrace: TraceStep[] = [];
  for (const v of vmas) {
    const res = tree.insert(v.lo, v.hi, v.label);
    allTrace.push(...res.trace);
  }

  // 1. Text hit: instruction fetch page fault
  const s1 = tree.search(0x00400500);
  allTrace.push(...s1.trace);

  // 2. Heap hit: dynamic memory read/write page fault
  const s2 = tree.search(0x00850000);
  allTrace.push(...s2.trace);

  // 3. NULL pointer dereference: unmapped virtual address triggering SIGSEGV
  const s3 = tree.search(0x00000000);
  allTrace.push(...s3.trace);

  return {
    success: true,
    trace: allTrace,
    tree: tree.snapshot()
  };
}

export function loadHolePunchDemo(tree: MapleTree): OperationResult {
  tree.reset(4);
  const items = [
    { lo: 0x1000, hi: 0x2000, label: "[text]" },
    { lo: 0x3000, hi: 0x4000, label: "[rodata]" },
    { lo: 0x5000, hi: 0x6000, label: "[data]" },
    { lo: 0x7000, hi: 0x17000, label: "[large_buf]" }, // 64KB buffer, fills leaf to 4/4
  ];

  const allTrace: TraceStep[] = [];
  for (const item of items) {
    const res = tree.insert(item.lo, item.hi, item.label);
    allTrace.push(...res.trace);
  }

  // Unmap middle 8KB of large_buf (0xb000 to 0xcfff).
  // Splits [large_buf] into [large_buf_head] and [large_buf_tail].
  // Leaf capacity expands from 4 to 5 entries, triggering overflow and RCU split during munmap!
  const unmapRes = tree.unmapRange(0xb000, 0xcfff);
  allTrace.push(...unmapRes.trace);

  return {
    success: true,
    trace: allTrace,
    tree: tree.snapshot()
  };
}

export function loadHeapBrkDemo(tree: MapleTree): OperationResult {
  tree.reset(4);
  const vmas = [
    { lo: 0x00400000, hi: 0x00400fff, label: "[text]" },
    { lo: 0x00401000, hi: 0x00401fff, label: "[rodata]" },
    { lo: 0x00600000, hi: 0x00600fff, label: "[data]" },
    { lo: 0x00800000, hi: 0x0084ffff, label: "[heap]" },
    { lo: 0x7f0000000000, hi: 0x7f00001fffff, label: "libc.so" },
  ];

  const allTrace: TraceStep[] = [];
  for (const v of vmas) {
    const res = tree.insert(v.lo, v.hi, v.label);
    allTrace.push(...res.trace);
  }

  // 1. Initial expansion: brk(0x00890000) (+256KB)
  const exp1 = tree.brk(0x00890000);
  allTrace.push(...exp1.trace);

  // 2. Further expansion: brk(0x008d0000) (+256KB)
  const exp2 = tree.brk(0x008d0000);
  allTrace.push(...exp2.trace);

  // 3. Compaction downward: brk(0x00870000) (-384KB)
  const comp = tree.brk(0x00870000);
  allTrace.push(...comp.trace);

  return {
    success: true,
    trace: allTrace,
    tree: tree.snapshot()
  };
}

// ============================================================================
// Track 3: 🛡️ Systems Security & Kernel Hardening (BSides / CTF Track)
// ============================================================================

export function loadAslrSparsityDemo(tree: MapleTree): OperationResult {
  tree.reset(4);
  const vmas = [
    { lo: 0x55a1b2c30000, hi: 0x55a1b2c34000, label: "[pie_text]" },
    { lo: 0x55a1b4d50000, hi: 0x55a1b4d80000, label: "[heap_aslr]" },
    { lo: 0x7f1a8b400000, hi: 0x7f1a8b5e0000, label: "libc-2.35.so" },
    { lo: 0x7f1a8b7f0000, hi: 0x7f1a8b810000, label: "ld-linux.so" },
    { lo: 0x7ffe3d920000, hi: 0x7ffe3d941000, label: "[stack]" },
  ];

  const allTrace: TraceStep[] = [];
  for (const v of vmas) {
    const res = tree.insert(v.lo, v.hi, v.label);
    allTrace.push(...res.trace);
  }

  // Search across the 45-Terabyte chasm to resolve libc symbol address
  const searchRes = tree.search(0x7f1a8b450000);
  allTrace.push(...searchRes.trace);

  return {
    success: true,
    trace: allTrace,
    tree: tree.snapshot()
  };
}

export function loadStackClashDemo(tree: MapleTree): OperationResult {
  tree.reset(4);
  const vmas = [
    { lo: 0x00400000, hi: 0x00401000, label: "[text]" },
    { lo: 0x00600000, hi: 0x00601000, label: "[data]" },
    { lo: 0x70000000, hi: 0x70050000, label: "[heap]" },
    { lo: 0x70070000, hi: 0x70090000, label: "[stack]" },
  ];

  const allTrace: TraceStep[] = [];
  for (const v of vmas) {
    const res = tree.insert(v.lo, v.hi, v.label);
    allTrace.push(...res.trace);
  }

  // Attempt downward stack expansion jumping guard page into heap (CVE-2017-1000364)
  const clashRes = tree.insert(0x70048000, 0x70068000, "[stack_clash_exploit]");
  allTrace.push(...clashRes.trace);

  return {
    success: true,
    trace: allTrace,
    tree: tree.snapshot()
  };
}

export function loadJitMprotectDemo(tree: MapleTree): OperationResult {
  tree.reset(4);
  const vmas = [
    { lo: 0x00400000, hi: 0x00402000, label: "[app_main]" },
    { lo: 0x00600000, hi: 0x00601000, label: "[data]" },
    { lo: 0x10000000, hi: 0x10020000, label: "[jit_arena: rw-]" },
    { lo: 0x7f0000000000, hi: 0x7f0000200000, label: "libc.so" },
  ];

  const allTrace: TraceStep[] = [];
  for (const v of vmas) {
    const res = tree.insert(v.lo, v.hi, v.label);
    allTrace.push(...res.trace);
  }

  // JIT compiles code into first 64KB, then applies mprotect to make it executable (W^X)
  const protRes = tree.mprotect(0x10000000, 0x1000ffff, "[jit_code: r-x]");
  allTrace.push(...protRes.trace);

  // CPU jumps to JIT code -> page resolution
  const searchRes = tree.search(0x10008000);
  allTrace.push(...searchRes.trace);

  return {
    success: true,
    trace: allTrace,
    tree: tree.snapshot()
  };
}

// ============================================================================
// Scenario Registry
// ============================================================================

export const SCENARIOS: Record<string, (tree: MapleTree) => OperationResult> = {
  // Track 1: CS Algorithms
  "split_demo": loadSplitDemo,
  "redistribute_demo": loadRedistributeDemo,
  "saturation_demo": loadSaturationDemo,
  "cascade_split_demo": loadCascadeSplitDemo,
  "delete_demo": loadDeleteDemo,

  // Track 2: Linux Virtual Memory Subsystem
  "process_vmas": loadProcessVmas,
  "page_fault_demo": loadPageFaultDemo,
  "hole_punch_demo": loadHolePunchDemo,
  "heap_brk_demo": loadHeapBrkDemo,

  // Track 3: Systems Security & Hardening
  "aslr_sparsity_demo": loadAslrSparsityDemo,
  "stack_clash_demo": loadStackClashDemo,
  "jit_mprotect_demo": loadJitMprotectDemo,
};
