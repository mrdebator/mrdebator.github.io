// Comprehensive Test & Invariant Verification Suite for Maple Tree Engine
import { MapleTree, MapleNode, MAX_SAFE_VADDR } from '../lib/labs/maple-tree-visualizer/tree';
import { parseHex } from '../components/labs/maple-tree-visualizer/controls';
import {
  SCENARIOS,
  loadSplitDemo,
  loadRedistributeDemo,
  loadSaturationDemo,
  loadCascadeSplitDemo,
  loadDeleteDemo,
  loadProcessVmas,
  loadPageFaultDemo,
  loadHolePunchDemo,
  loadHeapBrkDemo,
  loadAslrSparsityDemo,
  loadStackClashDemo,
  loadJitMprotectDemo
} from '../lib/labs/maple-tree-visualizer/presets';
import type { TreeView } from '../lib/labs/maple-tree-visualizer/types';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failedTests++;
    throw new Error(message);
  } else {
    passedTests++;
  }
}

function runTest(name: string, fn: () => void) {
  console.log(`\n--- Running: ${name} ---`);
  try {
    fn();
    console.log(`  PASSED: ${name}`);
  } catch (err: any) {
    console.error(`  FAILED: ${name}\n    ${err.message}`);
  }
}

// -------------------------------------------------------------
// Track 1: 🏛️ Core B-Tree & Maple Tree Mechanics (CS Algorithms)
// -------------------------------------------------------------

runTest("Scenario 1: Root Split Demo (split_demo)", () => {
  const tree = new MapleTree(4);
  const result = loadSplitDemo(tree);

  assert(result.success, "Scenario should succeed");
  assert(result.trace.length > 0, "Trace should contain steps");
  
  const err = tree.checkInvariants();
  assert(err === null, `Invariants must hold: ${err?.message}`);

  // Tree should have split, depth should now be 2
  assert(tree.root !== null && !tree.root.isLeaf, "Root should be an interior node after split");
  assert(tree.root!.children.length === 2, "Root should have 2 children");

  // Verify all trace snapshots are valid
  for (const step of result.trace) {
    assert(step.treeSnapshot !== null, `Step ${step.stepIndex} must have valid snapshot`);
    assert(step.title.length > 0, `Step ${step.stepIndex} must have title`);
  }
});

runTest("Scenario 2: B* Sibling Redistribution (redistribute_demo)", () => {
  const tree = new MapleTree(4);
  const result = loadRedistributeDemo(tree);

  assert(result.success, "Scenario should succeed");
  const err = tree.checkInvariants();
  assert(err === null, `Invariants must hold: ${err?.message}`);

  // Must have recorded B* sibling redistribution in both directions
  const redistributes = result.trace.filter(s => s.action === "split_redistribute");
  assert(redistributes.length >= 2, `Expected at least 2 redistribution events, got ${redistributes.length}`);
  const hasPushLeft = redistributes.some(s => s.title.includes("Push-Left"));
  const hasPushRight = redistributes.some(s => s.title.includes("Push-Right"));
  assert(hasPushLeft, "Trace must record Push-Left redistribution");
  assert(hasPushRight, "Trace must record Push-Right redistribution");
});

runTest("Scenario 3: Double-Sibling Saturation -> Forced Split (saturation_demo)", () => {
  const tree = new MapleTree(4);
  const result = loadSaturationDemo(tree);

  assert(result.success, "Scenario should succeed");
  const err = tree.checkInvariants();
  assert(err === null, `Invariants must hold: ${err?.message}`);

  // Trace must record sibling saturation detection
  const hasSaturationStep = result.trace.some(s => s.title.includes("Saturation"));
  assert(hasSaturationStep, "Trace must record Double-Sibling Saturation step");

  // Saturated split should produce 4 children in root
  assert(tree.root !== null && !tree.root.isLeaf, "Root should be interior");
  assert(tree.root!.children.length === 4, "Root should have 4 children after saturated split");
});

runTest("Scenario 4: Cascading Multi-Level Split (cascade_split_demo)", () => {
  const tree = new MapleTree(3);
  const result = loadCascadeSplitDemo(tree);

  assert(result.success, "Scenario should succeed");
  const err = tree.checkInvariants();
  assert(err === null, `Invariants must hold: ${err?.message}`);

  // Tree should reach depth 3 (Order 3 with 10 items)
  assert(tree.root !== null && !tree.root.isLeaf, "Root must be interior node");
  const depth2 = tree.root!.children[0];
  assert(!depth2.isLeaf, "Depth 2 node must be interior (Depth 3 overall)");

  // Verification lookup for 0x12500 should succeed
  const searchSteps = result.trace.filter(s => s.action === "found" && s.description.includes("0x12500"));
  assert(searchSteps.length > 0, "Trace must record successful search for 0x12500");
});

runTest("Scenario 5: Deletion, Underflow & Root Collapse (delete_demo)", () => {
  const tree = new MapleTree(4);
  const result = loadDeleteDemo(tree);

  assert(result.success, "Scenario should succeed");
  const err = tree.checkInvariants();
  assert(err === null, `Invariants must hold: ${err?.message}`);

  const hasDelete = result.trace.some(s => s.action === "delete");
  const hasCollapse = result.trace.some(s => s.action === "collapse");
  assert(hasDelete, "Trace must record deletion");
  assert(hasCollapse, "Trace must record single-child root collapse");
});

// -------------------------------------------------------------
// Track 2: 🐧 Linux Virtual Memory Subsystem (Kernel MM Realism)
// -------------------------------------------------------------

runTest("Scenario 6: Linux Process Memory Map (process_vmas)", () => {
  const tree = new MapleTree(4);
  const result = loadProcessVmas(tree);

  assert(result.success, "Scenario should succeed");
  const err = tree.checkInvariants();
  assert(err === null, `Invariants must hold: ${err?.message}`);

  // Verify lookup for every mapped range
  const testAddresses = [
    { addr: 0x00400500, label: "[text]" },
    { addr: 0x00401500, label: "[rodata]" },
    { addr: 0x00600800, label: "[data]" },
    { addr: 0x00601800, label: "[bss]" },
    { addr: 0x00850000, label: "[heap]" },
    { addr: 0x7f0000100000, label: "libc.so" },
    { addr: 0x7f0000250000, label: "ld.so" },
    { addr: 0x7ffffffdf000, label: "[stack]" },
    { addr: 0x7ffffffff800, label: "[vsyscall]" },
  ];

  for (const t of testAddresses) {
    const searchRes = tree.search(t.addr);
    assert(searchRes.success, `Search for 0x${t.addr.toString(16)} (${t.label}) must succeed`);
    assert(searchRes.entry?.label === t.label, `Expected ${t.label}, got ${searchRes.entry?.label}`);
  }

  // Verify lookup for unmapped addresses
  const unmapped = [0x0, 0x00100000, 0x00500000, 0x100000000000];
  for (const addr of unmapped) {
    const searchRes = tree.search(addr);
    assert(!searchRes.success, `Search for unmapped 0x${addr.toString(16)} must return not found`);
  }
});

runTest("Scenario 7: Demand Paging & Page Fault Resolution (page_fault_demo)", () => {
  const tree = new MapleTree(4);
  const result = loadPageFaultDemo(tree);

  assert(result.success, "Scenario should succeed");
  const err = tree.checkInvariants();
  assert(err === null, `Invariants must hold: ${err?.message}`);

  // Must have 2 found actions and 1 not_found action in search portion
  const founds = result.trace.filter(s => s.action === "found");
  const notFounds = result.trace.filter(s => s.action === "not_found");
  assert(founds.length >= 2, `Expected at least 2 page fault hits, got ${founds.length}`);
  assert(notFounds.length >= 1, `Expected at least 1 unmapped fault, got ${notFounds.length}`);
  assert(notFounds.some(s => s.description.includes("0x0")), "Must record SIGSEGV on NULL address 0x0");
});

runTest("Scenario 8: VMA Hole Punching (hole_punch_demo)", () => {
  const tree = new MapleTree(4);
  const result = loadHolePunchDemo(tree);

  assert(result.success, "Scenario should succeed");
  const err = tree.checkInvariants();
  assert(err === null, `Invariants must hold: ${err?.message}`);

  // Munmap should cause hole punch split and overflow
  const hasHolePunch = result.trace.some(s => s.title.includes("Hole Punch"));
  assert(hasHolePunch, "Trace must record Hole Punch step");
  const hasMunmapOverflow = result.trace.some(s => s.title.includes("Munmap Overflow"));
  assert(hasMunmapOverflow, "Trace must record Munmap Overflow step");

  // Verify head and tail pieces exist in tree
  const sHead = tree.search(0x8000);
  assert(sHead.success && sHead.entry?.label.includes("large_buf_head"), "Head piece must be retrievable");
  const sTail = tree.search(0xe000);
  assert(sTail.success && sTail.entry?.label.includes("large_buf_tail"), "Tail piece must be retrievable");

  // The punched hole should be unmapped
  const sHole = tree.search(0xc000);
  assert(!sHole.success, "Punched hole 0xc000 must be unmapped");
});

runTest("Scenario 9: Dynamic Heap Expansion & Compaction (heap_brk_demo)", () => {
  const tree = new MapleTree(4);
  const result = loadHeapBrkDemo(tree);

  assert(result.success, "Scenario should succeed");
  const err = tree.checkInvariants();
  assert(err === null, `Invariants must hold: ${err?.message}`);

  const hasExpand = result.trace.some(s => s.title.includes("Heap Expanded"));
  const hasCompact = result.trace.some(s => s.title.includes("Heap Compacted"));
  assert(hasExpand, "Trace must record brk heap expansion");
  assert(hasCompact, "Trace must record brk heap compaction");

  // Verify final heap boundaries (expanded then compacted to 0x00870000)
  const heapCheck = tree.search(0x00860000);
  assert(heapCheck.success && heapCheck.entry?.hi === 0x00870000, "Heap hi bound must equal 0x00870000");
  const heapBeyond = tree.search(0x00880000);
  assert(!heapBeyond.success, "Address beyond compacted heap must be unmapped");
});

// -------------------------------------------------------------
// Track 3: 🛡️ Systems Security & Kernel Hardening (BSides / CTF Track)
// -------------------------------------------------------------

runTest("Scenario 10: ASLR & 48-Bit Address Sparsity (aslr_sparsity_demo)", () => {
  const tree = new MapleTree(4);
  const result = loadAslrSparsityDemo(tree);

  assert(result.success, "Scenario should succeed");
  const err = tree.checkInvariants();
  assert(err === null, `Invariants must hold: ${err?.message}`);

  // Verify search across the 45-Terabyte chasm to libc
  const searchFound = result.trace.some(s => s.action === "found" && s.description.includes("libc-2.35.so"));
  assert(searchFound, "Trace must record successful O(log N) lookup of libc across 45TB gap");
});

runTest("Scenario 11: Stack Clash Guard Page Violation (stack_clash_demo)", () => {
  const tree = new MapleTree(4);
  const result = loadStackClashDemo(tree);

  assert(result.success, "Scenario should succeed");
  const err = tree.checkInvariants();
  assert(err === null, `Invariants must hold: ${err?.message}`);

  // Trace must record conflict action with CVE mitigation context
  const conflictStep = result.trace.find(s => s.action === "conflict");
  assert(conflictStep !== undefined, "Trace must record conflict action");
  assert(conflictStep!.title.includes("Range Conflict"), "Conflict title must identify range overlap");
  assert(conflictStep!.kernelReason.includes("CVE-2017-1000364"), "Kernel reason must cite Stack Clash CVE");
});

runTest("Scenario 12: W^X Security & JIT Compilation Lifecycle (jit_mprotect_demo)", () => {
  const tree = new MapleTree(4);
  const result = loadJitMprotectDemo(tree);

  assert(result.success, "Scenario should succeed");
  const err = tree.checkInvariants();
  assert(err === null, `Invariants must hold: ${err?.message}`);

  // Trace must record mprotect split and subsequent instruction search
  const hasMprotect = result.trace.some(s => s.title.includes("mprotect"));
  assert(hasMprotect, "Trace must record mprotect W^X split");
  const hasJitExec = result.trace.some(s => s.action === "found" && s.description.includes("jit_code: r-x"));
  assert(hasJitExec, "Trace must record execution lookup of jit_code: r-x");
});

// -------------------------------------------------------------
// Verification of SCENARIOS Registry
// -------------------------------------------------------------

runTest("SCENARIOS Registry: All 12 Scenarios Execute Successfully", () => {
  const scenarioKeys = Object.keys(SCENARIOS);
  assert(scenarioKeys.length === 12, `Registry must contain 12 scenarios, found ${scenarioKeys.length}`);

  for (const key of scenarioKeys) {
    const tree = new MapleTree(4);
    const res = SCENARIOS[key](tree);
    assert(res.success, `Scenario '${key}' must report success`);
    assert(res.trace.length > 0, `Scenario '${key}' must yield non-empty trace`);
    assert(res.tree !== null, `Scenario '${key}' must yield valid tree snapshot`);
    const invErr = tree.checkInvariants();
    assert(invErr === null, `Scenario '${key}' invariants violated: ${invErr?.message}`);
  }
});

// -------------------------------------------------------------
// Boundary & Edge Case Testing
// -------------------------------------------------------------
runTest("Edge Cases: Overlaps, Inverted Ranges, Non-Existent Deletes", () => {
  const tree = new MapleTree(4);

  // Inverted range in insert
  const invRes = tree.insert(0x5000, 0x1000, "inverted");
  assert(!invRes.success, "Inverted range (lo > hi) must be rejected");

  // Inverted range in delete
  const invDel = tree.delete(0x5000, 0x1000);
  assert(!invDel.success, "Inverted range in delete (lo > hi && hi > 0) must be rejected");

  // Initial insert
  tree.insert(0x2000, 0x3000, "base_vma");
  assert(tree.checkInvariants() === null, "Invariants after base insert");

  // Identical overlap
  const exactOverlap = tree.insert(0x2000, 0x3000, "dup");
  assert(!exactOverlap.success, "Identical range must be rejected as conflict");

  // Left overlap
  const leftOverlap = tree.insert(0x1500, 0x2500, "left_overlap");
  assert(!leftOverlap.success, "Left overlapping range must be rejected");

  // Right overlap
  const rightOverlap = tree.insert(0x2500, 0x3500, "right_overlap");
  assert(!rightOverlap.success, "Right overlapping range must be rejected");

  // Enclosing overlap
  const encOverlap = tree.insert(0x1000, 0x4000, "enclosing");
  assert(!encOverlap.success, "Enclosing range must be rejected");

  // Sub-range overlap
  const subOverlap = tree.insert(0x2200, 0x2800, "sub_range");
  assert(!subOverlap.success, "Sub-range must be rejected");

  // Delete non-existent
  const delNonExistent = tree.delete(0x9000, 0xa000);
  assert(!delNonExistent.success, "Deleting non-existent range must fail");

  assert(tree.checkInvariants() === null, "Invariants must hold after all failed edge cases");
});

runTest("VMA Partial Unmapping: Single Address, Prefix, Suffix & unmapRange()", () => {
  // 1. Single address deletion (hi === 0)
  const tree1 = new MapleTree(4);
  tree1.insert(0x1000, 0x2000, "test_vma");
  const delSingle = tree1.delete(0x1500, 0);
  assert(delSingle.success, "Delete by single address (hi=0) must succeed");
  assert(tree1.checkInvariants() === null, "Invariants must hold after single address delete");
  assert(!tree1.search(0x1500).success, "0x1500 must now be unmapped");

  // 2. Prefix unmap: [0x1000 - 0x2000] of [0x1000 - 0x3000]
  const tree2 = new MapleTree(4);
  tree2.insert(0x1000, 0x3000, "long_vma");
  const delPrefix = tree2.delete(0x1000, 0x2000);
  assert(delPrefix.success, "Prefix unmap must succeed");
  assert(tree2.checkInvariants() === null, "Invariants must hold after prefix unmap");
  const sAfterPrefix = tree2.search(0x2500);
  assert(sAfterPrefix.success && sAfterPrefix.entry?.lo === 0x2001, "Prefix unmap should shrink lo to 0x2001");
  assert(!tree2.search(0x1500).success, "Unmapped prefix must be absent");

  // 3. Suffix unmap: [0x2000 - 0x3000] of [0x1000 - 0x3000]
  const tree3 = new MapleTree(4);
  tree3.insert(0x1000, 0x3000, "long_vma");
  const delSuffix = tree3.delete(0x2000, 0x3000);
  assert(delSuffix.success, "Suffix unmap must succeed");
  assert(tree3.checkInvariants() === null, "Invariants must hold after suffix unmap");
  const sAfterSuffix = tree3.search(0x1500);
  assert(sAfterSuffix.success && sAfterSuffix.entry?.hi === 0x1fff, "Suffix unmap should shrink hi to 0x1fff");
  assert(!tree3.search(0x2500).success, "Unmapped suffix must be absent");

  // 4. unmapRange() delegation verification
  const tree4 = new MapleTree(4);
  tree4.insert(0x1000, 0x2000, "delegation_vma");
  const unmapRes = tree4.unmapRange(0x1000, 0x2000);
  assert(unmapRes.success, "unmapRange() delegation must succeed");
  assert(tree4.checkInvariants() === null, "Invariants must hold after unmapRange");
  assert(!tree4.search(0x1500).success, "Range must be unmapped");
});

runTest("Kernel Subsystem Edge Cases: brk() Boundaries & mprotect() Invariants", () => {
  const tree = new MapleTree(4);
  tree.insert(0x00400000, 0x00401000, "[text]");
  tree.insert(0x00800000, 0x00850000, "[heap]");
  tree.insert(0x00860000, 0x00880000, "[anon_guard]");

  // 1. brk below heap start must be rejected
  const brkBelowStart = tree.brk(0x007ff000);
  assert(!brkBelowStart.success, "brk below mm->start_brk must be rejected");
  assert(tree.checkInvariants() === null, "Invariants after rejected brk contraction");

  // 2. brk collision with next VMA must be rejected
  const brkCollision = tree.brk(0x00865000);
  assert(!brkCollision.success, "brk collision with [anon_guard] must be rejected");
  assert(tree.checkInvariants() === null, "Invariants after rejected brk collision");

  // 3. mprotect inverted range must be rejected
  const mprotectInv = tree.mprotect(0x00840000, 0x00820000, "[bad_prot]");
  assert(!mprotectInv.success, "mprotect with inverted range (lo > hi) must be rejected");
  assert(tree.checkInvariants() === null, "Invariants after rejected mprotect");

  // 4. mprotect suffix split verification
  const mprotSuffix = tree.mprotect(0x00830000, 0x00850000, "[heap_suffix]");
  assert(mprotSuffix.success, "mprotect suffix split must succeed");
  assert(tree.checkInvariants() === null, "Invariants after mprotect suffix split");
});

// -------------------------------------------------------------
// High-Branching Factor & Cascading Splits
// -------------------------------------------------------------
runTest("Cascading Splits & Multi-Level Depth (Order 3)", () => {
  const tree = new MapleTree(3);

  for (let i = 0; i < 20; i++) {
    const lo = i * 0x2000;
    const hi = lo + 0x1000;
    const res = tree.insert(lo, hi, `vma_${i}`);
    assert(res.success, `Insert vma_${i} must succeed`);
    
    const err = tree.checkInvariants();
    assert(err === null, `Invariants must hold after inserting vma_${i}: ${err?.message}`);
  }

  // Verify all 20 ranges are retrievable
  for (let i = 0; i < 20; i++) {
    const target = i * 0x2000 + 0x500;
    const searchRes = tree.search(target);
    assert(searchRes.success, `Must find vma_${i}`);
    assert(searchRes.entry?.label === `vma_${i}`, `Label match for vma_${i}`);
  }
});

// -------------------------------------------------------------
// Systematic Deletion to Zero & Tree Re-population
// -------------------------------------------------------------
runTest("Complete Drain & Re-population", () => {
  const tree = new MapleTree(4);

  // Populate 10 VMAs
  for (let i = 0; i < 10; i++) {
    tree.insert(i * 0x3000, i * 0x3000 + 0x1000, `item_${i}`);
  }
  assert(tree.checkInvariants() === null, "Invariants before drain");

  // Delete all 10 in reverse order
  for (let i = 9; i >= 0; i--) {
    const delRes = tree.delete(i * 0x3000, i * 0x3000 + 0x1000);
    assert(delRes.success, `Delete item_${i} must succeed`);
    const err = tree.checkInvariants();
    assert(err === null, `Invariants must hold after deleting item_${i}: ${err?.message}`);
  }

  // Re-insert into emptied tree
  const reInsert = tree.insert(0x1000, 0x2000, "phoenix_vma");
  assert(reInsert.success, "Re-insert into drained tree must succeed");
  assert(tree.checkInvariants() === null, "Invariants after re-insert");
});

// -------------------------------------------------------------
// Randomized Stress & Invariant Fuzzing
// -------------------------------------------------------------
runTest("Fuzzing: 100 Random Insertions & Deletions with Invariant Checks", () => {
  const tree = new MapleTree(4);
  const inserted: { lo: number; hi: number; label: string }[] = [];

  // Generate 60 non-overlapping ranges
  for (let i = 0; i < 60; i++) {
    const lo = i * 0x10000 + 0x1000;
    const hi = lo + 0x4000;
    const label = `fuzz_${i}`;
    const res = tree.insert(lo, hi, label);
    assert(res.success, `Fuzz insert ${i} must succeed`);
    inserted.push({ lo, hi, label });

    const err = tree.checkInvariants();
    assert(err === null, `Fuzz invariant failed on insert ${i}: ${err?.message}`);
  }

  // Randomly search 30 addresses
  for (let i = 0; i < 30; i++) {
    const targetItem = inserted[Math.floor(Math.random() * inserted.length)];
    const insideAddr = targetItem.lo + Math.floor(Math.random() * (targetItem.hi - targetItem.lo));
    const searchRes = tree.search(insideAddr);
    assert(searchRes.success, `Search inside fuzz range [${targetItem.lo}-${targetItem.hi}] must succeed`);
    assert(searchRes.entry?.label === targetItem.label, "Fuzz search label must match");
  }

  // Delete 40 random items
  while (inserted.length > 20) {
    const randIdx = Math.floor(Math.random() * inserted.length);
    const item = inserted.splice(randIdx, 1)[0];
    const delRes = tree.delete(item.lo, item.hi);
    assert(delRes.success, `Fuzz delete of ${item.label} must succeed`);

    const err = tree.checkInvariants();
    assert(err === null, `Fuzz invariant failed on delete ${item.label}: ${err?.message}`);
  }

  console.log(`  Fuzzing completed successfully with 20 remaining nodes verified.`);
});

// -------------------------------------------------------------
// Track 4: 🛡️ Security, Input Sanitization & Robustness Guards
// -------------------------------------------------------------

runTest("Input Sanitization: parseHex() Strict Hex Validation", () => {
  // Valid hexadecimal inputs
  assert(parseHex("0x1000") === 0x1000, "0x1000 should parse as 4096");
  assert(parseHex("0X2000") === 0x2000, "0X2000 (uppercase prefix) should parse as 8192");
  assert(parseHex("1000") === 0x1000, "1000 should parse as 0x1000 (hex)");
  assert(parseHex("deadbeef") === 0xdeadbeef, "deadbeef should parse as 0xdeadbeef");
  assert(parseHex("0x0") === 0, "0x0 should parse as 0");
  assert(parseHex("0") === 0, "0 should parse as 0");
  assert(parseHex("0000") === 0, "0000 should parse as 0");
  assert(parseHex("  0x4000  ") === 0x4000, "Padded 0x4000 should trim and parse");
  assert(parseHex("0x00000000000000000") === 0, "64-bit padded 0x00000000000000000 should parse as 0");
  assert(parseHex("0x00000000000400000") === 0x400000, "Formatted 0x00000000000400000 should normalize leading zeros and parse");
  assert(parseHex("00000000000400000") === 0x400000, "Raw padded 00000000000400000 should normalize leading zeros and parse");
  assert(parseHex("0x7fffffffffff") === 0x7fffffffffff, "Canonical 48-bit max address 0x7fffffffffff should parse");
  assert(parseHex("7fffffffffff") === 0x7fffffffffff, "Canonical 48-bit max address without prefix should parse");
  assert(parseHex("0x00007fffffffffff") === 0x7fffffffffff, "Padded canonical 48-bit max address should parse");

  // Invalid inputs that must return null
  assert(parseHex("") === null, "Empty string should return null");
  assert(parseHex("   ") === null, "Whitespace-only should return null");
  assert(parseHex("0x") === null, "Prefix only '0x' should return null");
  assert(parseHex("0X") === null, "Prefix only '0X' should return null");
  assert(parseHex("xyz") === null, "Non-hex string 'xyz' should return null");
  assert(parseHex("0x12z34") === null, "Malformed hex '0x12z34' should return null");
  assert(parseHex("-1") === null, "Negative '-1' should return null");
  assert(parseHex("-0x1000") === null, "Negative '-0x1000' should return null");
  assert(parseHex("-0x7fffffffffff") === null, "Negative max 48-bit should return null");
  assert(parseHex("+0x1000") === null, "Positive signed '+0x1000' should return null");
  assert(parseHex("+1000") === null, "Positive signed '+1000' should return null");
  assert(parseHex("+0x7fffffffffff") === null, "Positive signed max 48-bit should return null");
  assert(parseHex("12.34") === null, "Float '12.34' should return null");
  assert(parseHex("0x12.34") === null, "Float hex '0x12.34' should return null");
  assert(parseHex("0x800000000000") === null, "12-digit hex exceeding MAX_SAFE_VADDR (0x800000000000) should return null");
  assert(parseHex("800000000000") === null, "12-digit hex without prefix exceeding MAX_SAFE_VADDR should return null");
  assert(parseHex("0x1000000000000") === null, "Hex string with 13 digits (> 48-bit) should return null");
  assert(parseHex("1000000000000") === null, "Hex string without prefix with 13 digits (> 48-bit) should return null");
  assert(parseHex("0xffffffffffffffff") === null, "64-bit max address 0xffffffffffffffff exceeding 48-bit bound should return null");
  assert(parseHex("ffffffffffffffff") === null, "64-bit max address without prefix exceeding 48-bit bound should return null");
  assert(parseHex("0x10000000000000000") === null, "Hex string exceeding 16 digits should return null");
  assert(parseHex("10000000000000000") === null, "Hex string without prefix exceeding 16 digits should return null");
  assert(parseHex("NaN") === null, "NaN string should return null");
  assert(parseHex("Infinity") === null, "Infinity string should return null");
  assert(parseHex(undefined as any) === null, "undefined input should return null cleanly");
  assert(parseHex(null as any) === null, "null input should return null cleanly");
  assert(parseHex(1234 as any) === null, "numeric input should return null cleanly");
});

runTest("Security Guards: Tree API Defensive Validation (NaN, Non-Safe Ints, Inverted Bounds)", () => {
  const tree = new MapleTree(4);
  tree.insert(0x1000, 0x2000, "test_vma");

  // 1. search() validation
  const badSearchNaN = tree.search(NaN);
  assert(!badSearchNaN.success, "search(NaN) must be rejected");
  assert(badSearchNaN.trace.length === 0, "search(NaN) must not create trace steps");

  const badSearchNeg = tree.search(-1);
  assert(!badSearchNeg.success, "search(-1) must be rejected");

  const badSearchInf = tree.search(Infinity);
  assert(!badSearchInf.success, "search(Infinity) must be rejected");

  const badSearchFloat = tree.search(4096.5);
  assert(!badSearchFloat.success, "search(float) must be rejected");

  const badSearchOverflow = tree.search(2 ** 65);
  assert(!badSearchOverflow.success, "search(overflow beyond 64-bit) must be rejected");

  const badSearchExceedVaddr = tree.search(MAX_SAFE_VADDR + 1);
  assert(!badSearchExceedVaddr.success, "search(MAX_SAFE_VADDR + 1) must be rejected");
  assert(badSearchExceedVaddr.error?.includes("canonical 48-bit address space"), "search error must cite canonical 48-bit address space");

  const badSearchNull = tree.search(null as any);
  assert(!badSearchNull.success, "search(null) must be rejected");

  // 2. insert() validation
  const badInsertNaNLo = tree.insert(NaN, 0x3000, "bad_lo");
  assert(!badInsertNaNLo.success, "insert(NaN, hi) must be rejected");

  const badInsertNaNHi = tree.insert(0x2000, NaN, "bad_hi");
  assert(!badInsertNaNHi.success, "insert(lo, NaN) must be rejected");

  const badInsertNegLo = tree.insert(-0x1000, 0x2000, "neg_lo");
  assert(!badInsertNegLo.success, "insert(-lo, hi) must be rejected");

  const badInsertNegHi = tree.insert(0x1000, -0x2000, "neg_hi");
  assert(!badInsertNegHi.success, "insert(lo, -hi) must be rejected");

  const badInsertFloat = tree.insert(4096.5, 0x2000, "float_lo");
  assert(!badInsertFloat.success, "insert(float, hi) must be rejected");

  const badInsertInverted = tree.insert(0x3000, 0x2000, "inverted");
  assert(!badInsertInverted.success, "insert(lo > hi) must be rejected");

  const badInsertOverflow = tree.insert(0x1000, 2 ** 65, "overflow_hi");
  assert(!badInsertOverflow.success, "insert(lo, overflow beyond 64-bit) must be rejected");

  const badInsertExceedVaddr = tree.insert(0x1000, MAX_SAFE_VADDR + 1, "exceed_hi");
  assert(!badInsertExceedVaddr.success, "insert(hi > MAX_SAFE_VADDR) must be rejected");
  assert(badInsertExceedVaddr.error?.includes("canonical 48-bit address space"), "insert error must cite canonical 48-bit address space");

  const badInsertNullLabel = tree.insert(0x4000, 0x5000, null as any);
  assert(!badInsertNullLabel.success, "insert(lo, hi, null label) must be rejected");

  const badInsertEmptyLabel = tree.insert(0x4000, 0x5000, "   ");
  assert(!badInsertEmptyLabel.success, "insert(lo, hi, whitespace label) must be rejected");

  // 3. delete() validation
  const badDelNaNLo = tree.delete(NaN, 0x2000);
  assert(!badDelNaNLo.success, "delete(NaN, hi) must be rejected");

  const badDelNaNHi = tree.delete(0x1000, NaN);
  assert(!badDelNaNHi.success, "delete(lo, NaN) must be rejected");

  const badDelNegLo = tree.delete(-1, 0);
  assert(!badDelNegLo.success, "delete(neg, 0) must be rejected");

  const badDelNegHi = tree.delete(0x1000, -1);
  assert(!badDelNegHi.success, "delete(lo, neg) must be rejected");

  const badDelInverted = tree.delete(0x5000, 0x2000);
  assert(!badDelInverted.success, "delete(lo > hi && hi > 0) must be rejected");

  const badDelFloat = tree.delete(4096.5, 0x2000);
  assert(!badDelFloat.success, "delete(float, hi) must be rejected");

  // 4. unmapRange() validation
  const badUnmapNaN = tree.unmapRange(NaN, 0x2000);
  assert(!badUnmapNaN.success, "unmapRange(NaN, hi) must be rejected");

  const badUnmapInverted = tree.unmapRange(0x3000, 0x2000);
  assert(!badUnmapInverted.success, "unmapRange(lo > hi) must be rejected");

  const badUnmapNeg = tree.unmapRange(-1, 0x2000);
  assert(!badUnmapNeg.success, "unmapRange(neg, hi) must be rejected");

  // 5. brk() validation
  const badBrkNaN = tree.brk(NaN);
  assert(!badBrkNaN.success, "brk(NaN) must be rejected");

  const badBrkNeg = tree.brk(-1);
  assert(!badBrkNeg.success, "brk(-1) must be rejected");

  const badBrkInf = tree.brk(Infinity);
  assert(!badBrkInf.success, "brk(Infinity) must be rejected");

  const badBrkFloat = tree.brk(4096.5);
  assert(!badBrkFloat.success, "brk(float) must be rejected");

  // 6. mprotect() validation
  const badMprotNaN = tree.mprotect(NaN, 0x2000, "new_prot");
  assert(!badMprotNaN.success, "mprotect(NaN, hi) must be rejected");

  const badMprotNeg = tree.mprotect(-1, 0x2000, "new_prot");
  assert(!badMprotNeg.success, "mprotect(-1, hi) must be rejected");

  const badMprotInverted = tree.mprotect(0x3000, 0x2000, "new_prot");
  assert(!badMprotInverted.success, "mprotect(lo > hi) must be rejected");

  const badMprotNullLabel = tree.mprotect(0x1000, 0x1500, null as any);
  assert(!badMprotNullLabel.success, "mprotect(lo, hi, null label) must be rejected");

  const badMprotEmptyLabel = tree.mprotect(0x1000, 0x1500, "   ");
  assert(!badMprotEmptyLabel.success, "mprotect(lo, hi, empty label) must be rejected");

  // 7. Constructor & reset() order validation
  const treeBadOrder = new MapleTree(NaN);
  assert(treeBadOrder.order === 4, "MapleTree(NaN) should fallback to order 4");

  const treeSmallOrder = new MapleTree(1);
  assert(treeSmallOrder.order === 4, "MapleTree(1) should fallback to order 4");

  const resetRes = treeBadOrder.reset(-5);
  assert(resetRes.success, "reset(-5) should succeed with fallback");
  assert(treeBadOrder.order === 4, "reset(-5) should fallback to order 4");

  // Invariants must hold cleanly after all invalid operations
  const err = tree.checkInvariants();
  assert(err === null, `Invariants must hold after rejected inputs: ${err?.message}`);
});

runTest("Regression: Cross-Leaf brk() Collision, Invariant Capacity, Middle mprotect() Multi-Entry", () => {
  // 1. Cross-leaf brk() collision across subtree boundary
  const tree3 = new MapleTree(3);
  tree3.insert(0x1000, 0x2000, "text");
  tree3.insert(0x3000, 0x4000, "heap");
  tree3.insert(0x5000, 0x6000, "data");
  tree3.insert(0x7000, 0x8000, "stack");
  
  // Heap expands past Leaf 0 boundary and collides with 'data' [0x5000 - 0x6000] in Leaf 1
  const brkCrossCollision = tree3.brk(0x5500);
  assert(!brkCrossCollision.success, "brk(0x5500) must detect collision with 'data' in adjacent leaf");
  assert(brkCrossCollision.error?.includes("overlaps with 'data'"), "brk collision error must mention overlapping 'data' VMA");
  assert(tree3.checkInvariants() === null, "Tree invariants must remain valid after cross-leaf brk rejection");

  // Valid expansion that stops before successor VMA
  const validBrk = tree3.brk(0x4fff);
  assert(validBrk.success, "brk(0x4fff) before successor start (0x5000) must succeed");
  assert(tree3.checkInvariants() === null, "Tree invariants must remain valid after successful brk");

  // 2. Invariant validator capacity enforcement
  const treeCap = new MapleTree(4);
  treeCap.insert(0x1000, 0x2000, "v1");
  treeCap.insert(0x3000, 0x4000, "v2");
  treeCap.insert(0x5000, 0x6000, "v3");
  treeCap.insert(0x7000, 0x8000, "v4");
  assert(treeCap.checkInvariants() === null, "Tree must be valid with 4 entries");

  // Manually force-overfill leaf to test validateNode capacity check
  (treeCap.root as any).entries.push({ lo: 0x9000, hi: 0x9500, label: "v5_illegal" });
  const capErr = treeCap.checkInvariants();
  assert(capErr !== null, "checkInvariants() must detect leaf capacity violation");
  assert(capErr?.message.includes("exceeds capacity 4"), "Error message must report capacity violation exceeding order");

  // 3. Middle mprotect() multi-entry overfill resolution
  const treeMprot = new MapleTree(4);
  treeMprot.insert(0x1000, 0x2000, "v1");
  treeMprot.insert(0x3000, 0x7000, "large_buf: rw-");
  treeMprot.insert(0x8000, 0x9000, "v3");
  treeMprot.insert(0xa000, 0xb000, "v4");
  assert(treeMprot.checkInvariants() === null, "Initial 4-entry leaf must be valid");

  // Splitting middle of large_buf creates head, mid, and tail (+2 entries -> 6 entries in order 4)
  const mprotRes = treeMprot.mprotect(0x4000, 0x6000, "mid_rx: r-x");
  assert(mprotRes.success, "Middle mprotect() must succeed and resolve multi-entry overfill");
  assert(treeMprot.checkInvariants() === null, "Tree invariants must hold with no node exceeding order 4 after middle mprotect split");
});

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log(`\n========================================`);
console.log(`All Tests Completed: ${passedTests} passed assertions, ${failedTests} failed`);
console.log(`========================================\n`);

if (failedTests > 0) {
  process.exit(1);
}
