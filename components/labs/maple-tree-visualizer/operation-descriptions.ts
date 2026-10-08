// Strongly typed operation descriptions and kernel context
// Provides detailed, educational intent for all visualizer operations

export interface OperationDescription {
  badge: string;
  title: string;
  syscall: string;
  intent: string;
  expectedOutcome: string;
}

export const SCENARIO_DESCRIPTIONS: Record<string, OperationDescription> = {
  // Track 1: CS Algorithms
  split_demo: {
    badge: 'CS Algorithms',
    title: 'B-Tree Node Split & Height Growth',
    syscall: 'mmap(0x9000, 0xa000, "[anon1]")',
    intent: 'Attempting to insert a 5th VMA into an Order-4 leaf that already holds 4 VMAs ([text], [rodata], [data], [heap]). The leaf capacity is saturated (5 entries > 4 max slots), making it impossible to store all entries in a single node.',
    expectedOutcome: 'Triggers an RCU node split. Allocates a new interior root node, redistributes entries 50/50 across two sibling leaves, and increases tree depth from 1 to 2.'
  },
  redistribute_demo: {
    badge: 'CS Algorithms',
    title: 'B* Sibling Balancing (Push-Left & Push-Right)',
    syscall: 'mmap(0xd000, 0xe000, "[anon3]")',
    intent: 'Demonstrating B* balancing in both directions. When right leaf overflows, it pushes lowest entry left into sibling. After deleting anon3, inserting into left leaf overflows left, which pushes highest entry right into sibling.',
    expectedOutcome: 'Pushes boundary entries into adjacent siblings and recalculates parent pivots. Avoids premature node allocations and maintains high memory density.'
  },
  saturation_demo: {
    badge: 'CS Algorithms',
    title: 'Double-Sibling Saturation -> Forced Split',
    syscall: 'mmap(0x5d00, 0x5e00, "[saturated_split]")',
    intent: 'Order 4: Root has 3 sibling leaves, all populated to 100% (4/4) capacity. Inserting an entry into middle child triggers overflow. Sibling balancing evaluates left sibling (4/4 full) and right sibling (4/4 full).',
    expectedOutcome: 'Because both adjacent siblings are fully saturated, B* redistribution is rejected. The tree forces an RCU split of the middle node, adding a 4th child to the parent root.'
  },
  cascade_split_demo: {
    badge: 'CS Algorithms',
    title: 'Cascading Multi-Level Split (Order 3)',
    syscall: 'mmap(0x12000, 0x13000, "vma_9") -> page_fault(0x12500)',
    intent: 'Using low-order B-Tree (Order 3) to demonstrate cascading splits. Populating 10 VMAs sequentially causes Leaf 4 to overflow, which triggers an overflow in Parent Node 3, propagating splits upward to root.',
    expectedOutcome: 'Root Node 3 overflows and splits, allocating Node 7 as new root at Depth 3. Traversal of virtual address 0x12500 verifies O(log N) depth-3 leaf resolution.'
  },
  delete_demo: {
    badge: 'CS Algorithms',
    title: 'VMA Deletion, Underflow & Root Collapse',
    syscall: 'munmap(0x5000, 0x6000) -> munmap(0x7000, 0x8000) -> munmap(0x9000, 0xa000)',
    intent: 'Sequentially unmapping memory ranges from a 2-level tree to observe automatic memory reclamation and structural compaction.',
    expectedOutcome: 'Empty leaves are unlinked and freed via RCU. When the root is left with only a single interior child, the redundant level collapses downward to minimize lookup latency.'
  },

  // Track 2: Linux Virtual Memory Subsystem
  process_vmas: {
    badge: 'Linux MM Subsystem',
    title: '64-Bit ELF Process Address Space',
    syscall: 'execve("/usr/bin/target")',
    intent: 'Populating 9 standard virtual memory areas ([text], [rodata], [data], [bss], [heap], libc.so, ld.so, [stack], [vdso]) across canonical 48-bit user virtual address space (0x00400000 through 0xffffffffff600000).',
    expectedOutcome: 'Constructs a realistic Linux process address space map, demonstrating how sparse, distant address ranges are compactly indexed with high branching efficiency.'
  },
  page_fault_demo: {
    badge: 'Linux MM Subsystem',
    title: 'Demand Paging & Page Fault Resolution',
    syscall: 'page_fault(0x00400500) -> page_fault(0x00850000) -> page_fault(0x0)',
    intent: 'Kernel mm handling page faults for valid code, dynamic heap, and an invalid NULL pointer dereference. Walks interior pivots to find the containing VMA and check VM_READ/VM_WRITE permissions.',
    expectedOutcome: 'Successfully resolves [text] and [heap] VMAs locklessly under RCU. Resolving 0x0 finds no covering VMA, generating an unmapped fault and raising SIGSEGV.'
  },
  hole_punch_demo: {
    badge: 'Linux MM Subsystem',
    title: 'VMA Hole Punching: Munmap Overflow',
    syscall: 'munmap(0xb000, 0xcfff)',
    intent: 'Leaf is filled to 4/4 capacity with a 64KB [large_buf]. Unmapping an 8KB middle sub-range punches a hole, splitting [large_buf] into two independent VMAs ([large_buf_head] and [large_buf_tail]).',
    expectedOutcome: 'Counterintuitively, unmapping memory increases leaf entry count from 4 to 5, exceeding capacity and triggering an RCU node split during munmap().'
  },
  heap_brk_demo: {
    badge: 'Linux MM Subsystem',
    title: 'Dynamic Heap Expansion & Compaction',
    syscall: 'brk(0x890000) -> brk(0x8d0000) -> brk(0x870000)',
    intent: 'Demonstrating glibc malloc/free interaction with sys_brk(). Extending mm->brk grows the heap VMA boundary upward; contracting mm->brk compacts the heap downward.',
    expectedOutcome: 'Maple Tree updates the upper boundary of [heap] and propagates new pivots up ancestor nodes in-place, without allocating new tree nodes.'
  },

  // Track 3: Systems Security & Kernel Hardening
  aslr_sparsity_demo: {
    badge: 'Systems Security',
    title: 'ASLR & 48-Bit Virtual Address Sparsity',
    syscall: 'mmap(..., MAP_PRIVATE|MAP_ANONYMOUS)',
    intent: 'High-entropy Address Space Layout Randomization (ASLR) positions heap (0x55a1...), shared libraries (0x7f1a...), and stack (0x7ffe...) tens of terabytes apart in 48-bit canonical user space.',
    expectedOutcome: 'Range-keyed B-Tree cleanly bridges the 45+ Terabyte chasm in a single pivot comparison, avoiding sparse multi-level page table overhead and resolving libc lookups in O(log N).'
  },
  stack_clash_demo: {
    badge: 'Systems Security',
    title: 'Stack Clash & Guard Page Violation (CVE-2017-1000364)',
    syscall: 'mmap(0x70048000, 0x70068000, MAP_FIXED_NOREPLACE)',
    intent: 'Simulating CVE-2017-1000364 Stack Clash exploit. An attacker attempts downward stack expansion jumping past the guard gap into the heap to overwrite target control structures.',
    expectedOutcome: 'Maple Tree range comparison detects boundary collision with [heap] [0x70000000 - 0x70050000]. Insertion is rejected with action CONFLICT and -ENOMEM.'
  },
  jit_mprotect_demo: {
    badge: 'Systems Security',
    title: 'W^X Security & JIT Compilation Lifecycle',
    syscall: 'mprotect(0x10000000, 0x1000ffff, PROT_READ|PROT_EXEC)',
    intent: 'Modern runtimes (V8, JVM, eBPF) enforce Write XOR Execute (W^X). Memory is first mapped writable [jit_arena: rw-]. Once machine code is compiled, mprotect strips write permission and marks code executable [jit_code: r-x].',
    expectedOutcome: 'Kernel mm splits [jit_arena] into distinct [jit_code: r-x] and [jit_data: rw-] VMAs. Page fault traversal verifies execution branch to the newly executable JIT page.'
  }
};

export function getManualInsertDescription(lo: number, hi: number, label: string): OperationDescription {
  return {
    badge: 'VMA Allocation',
    title: `Map Virtual Range '${label}'`,
    syscall: `mmap(0x${lo.toString(16)}, 0x${hi.toString(16)}, "${label}")`,
    intent: `Allocating new virtual memory area for '${label}' [0x${lo.toString(16)} - 0x${hi.toString(16)}]. Traverses pivots via mas_walk() to locate the appropriate leaf slot, verifies that the range does not collide with existing VMAs, and stores the descriptor.`,
    expectedOutcome: 'Inserts descriptor in sorted order. If node capacity is exceeded, initiates sibling redistribution or RCU node split and updates ancestor pivots.'
  };
}

export function getManualSearchDescription(addr: number): OperationDescription {
  return {
    badge: 'Page Fault Lookup',
    title: `Locate Address 0x${addr.toString(16)}`,
    syscall: `page_fault(0x${addr.toString(16)})`,
    intent: `Kernel page fault handler looking up the VMA descriptor covering virtual address 0x${addr.toString(16)}. Compares target with interior pivot boundaries (addr ≤ pivot[i]) to descend to the containing leaf node.`,
    expectedOutcome: 'Returns the matching VMA descriptor and permission flags with O(log N) lookup time without writer lock contention under RCU.'
  };
}

export function getManualDeleteDescription(lo: number, hi: number): OperationDescription {
  return {
    badge: 'VMA Unmap',
    title: `Unmap Range [0x${lo.toString(16)} - 0x${hi.toString(16)}]`,
    syscall: `munmap(0x${lo.toString(16)}, 0x${hi.toString(16)})`,
    intent: `Unmapping address range [0x${lo.toString(16)} - 0x${hi.toString(16)}]. Locates the target VMA in leaf slots, compacts remaining entries, and evaluates underflow thresholds.`,
    expectedOutcome: 'Reclaims virtual address space. Empty leaves are unlinked and freed via RCU; single-child interior ancestors collapse downward to minimize tree height.'
  };
}

export function getInitialDescription(order: number): OperationDescription {
  return {
    badge: 'System Ready',
    title: 'Maple Tree Initialized',
    syscall: `mt_init(order=${order})`,
    intent: `Range-keyed B-Tree initialized with branching order ${order}. The tree begins with an empty root leaf spanning the full 64-bit virtual address space [0x0 - 0xffffffffffffffff].`,
    expectedOutcome: 'Select a guided demo above or perform manual mmap / munmap operations in the sidebar to observe live kernel data structure transitions.'
  };
}
