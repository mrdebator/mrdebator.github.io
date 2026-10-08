"use client";

import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { MapleTree } from '@/lib/labs/maple-tree-visualizer/tree';
import { SCENARIOS } from '@/lib/labs/maple-tree-visualizer/presets';
import { TraceStep, TreeView } from '@/lib/labs/maple-tree-visualizer/types';
import TreeCanvas, { TreeCanvasHandle } from './tree-canvas';
import { Controls } from './controls';
import {
  OperationDescription,
  SCENARIO_DESCRIPTIONS,
  getManualInsertDescription,
  getManualSearchDescription,
  getManualDeleteDescription,
  getInitialDescription
} from './operation-descriptions';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  GitBranch,
  Cpu,
  Activity,
  SlidersHorizontal
} from 'lucide-react';
import './maple-tree.css';

export function MapleTreeVisualizer() {
  const [treeInstance, setTreeInstance] = useState(() => new MapleTree(4));
  const [treeData, setTreeData] = useState<TreeView | null>(null);
  
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [stepIndex, setStepIndex] = useState(-1);
  
  const [isPlaying, setIsPlaying] = useState(false);

  const [order, setOrder] = useState(4);
  const [scenario, setScenario] = useState('');
  
  const [activeOperation, setActiveOperation] = useState<OperationDescription>(() => getInitialDescription(4));
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(false);

  const canvasRef = useRef<TreeCanvasHandle>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const wasDrawerOpenRef = useRef(false);

  useEffect(() => {
    setTreeData(treeInstance.snapshot());
  }, []);

  // Restore focus to mobile drawer trigger button upon closing
  useEffect(() => {
    if (!isMobileControlsOpen && wasDrawerOpenRef.current) {
      drawerTriggerRef.current?.focus();
    }
    wasDrawerOpenRef.current = isMobileControlsOpen;
  }, [isMobileControlsOpen]);

  // Escape key listener to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileControlsOpen) {
        setIsMobileControlsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileControlsOpen]);

  // Focus trap inside mobile drawer
  useEffect(() => {
    if (!isMobileControlsOpen) return;
    const drawerEl = drawerRef.current;
    if (!drawerEl) return;

    const focusable = drawerEl.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const firstEl = focusable[0];
    const lastEl = focusable[focusable.length - 1];

    firstEl.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [isMobileControlsOpen]);

  useEffect(() => {
    if (isMobileControlsOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileControlsOpen]);

  const handleResult = (result: any) => {
    setIsPlaying(false);
    if (result.tree) {
      setTreeData(result.tree);
    }
    if (result.trace && result.trace.length > 0) {
      setTrace(result.trace);
      setStepIndex(0);
    } else {
      setTrace([]);
      setStepIndex(-1);
    }
  };

  const notifyError = (msg: string) => {
    console.warn(msg);
    toast.error(msg);
  };

  const handleInsert = (lo: number, hi: number, label: string) => {
    setActiveOperation(getManualInsertDescription(lo, hi, label));
    const res = treeInstance.insert(lo, hi, label);
    if (!res.success && res.error) notifyError(res.error);
    handleResult(res);
  };

  const handleSearch = (addr: number) => {
    setActiveOperation(getManualSearchDescription(addr));
    const res = treeInstance.search(addr);
    if (!res.success && res.error) notifyError(res.error);
    handleResult(res);
  };

  const handleDelete = (lo: number, hi: number) => {
    setActiveOperation(getManualDeleteDescription(lo, hi));
    const res = treeInstance.delete(lo, hi);
    if (!res.success && res.error) notifyError(res.error);
    handleResult(res);
  };

  const handleReset = (newOrder: number) => {
    setActiveOperation(getInitialDescription(newOrder));
    setScenario('');
    const res = treeInstance.reset(newOrder);
    setOrder(newOrder);
    handleResult(res);
  };

  const handleScenario = (scenarioKey: string) => {
    setScenario(scenarioKey);
    if (Object.hasOwn(SCENARIOS, scenarioKey)) {
      const desc = SCENARIO_DESCRIPTIONS[scenarioKey];
      if (desc) {
        setActiveOperation(desc);
      }
      const fn = SCENARIOS[scenarioKey];
      if (typeof fn === 'function') {
        const res = fn(treeInstance);
        setOrder(treeInstance.order);
        handleResult(res);
      }
    }
  };

  const handleStep = (idx: number) => {
    if (idx >= 0 && idx < trace.length) {
      setStepIndex(idx);
    }
  };

  const togglePlay = () => {
    if (!isPlaying && stepIndex >= trace.length - 1) {
      setStepIndex(0);
    }
    setIsPlaying(prev => !prev);
  };

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = 900;
      timerRef.current = setInterval(() => {
        setStepIndex(prev => {
          if (prev >= trace.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, trace.length]);

  const step = trace[stepIndex];
  const currentTreeData = step?.treeSnapshot || treeData;
  const highlights = step?.highlights || (step?.nodeId ? [step.nodeId] : []);
  const actionClass = step?.action || '';
  const activeSlot = step?.activeSlot ?? -1;

  const formatActionBadge = (action: string) => {
    switch (action) {
      case 'split_redistribute': return 'B* REDISTRIBUTE';
      case 'split': return 'RCU SPLIT';
      case 'collapse': return 'ROOT COLLAPSE';
      case 'overflow': return 'OVERFLOW';
      case 'underflow': return 'UNDERFLOW';
      case 'compare': return 'COMPARE';
      case 'descend': return 'DESCEND';
      case 'found': return 'FOUND';
      case 'not_found': return 'UNMAPPED';
      case 'conflict': return 'CONFLICT';
      default: return action?.toUpperCase() || 'READY';
    }
  };

  // Dynamically synchronize active syscall telemetry with the current scrubbed step
  const getStepSyscallInfo = (currentStep: TraceStep | undefined, defaultOp: OperationDescription) => {
    if (!currentStep) {
      return { syscall: defaultOp.syscall, badge: defaultOp.badge };
    }

    const { action, title } = currentStep;
    const syscall = currentStep.syscall || defaultOp.syscall;

    let badge = formatActionBadge(action);
    if (action === 'conflict') {
      badge = 'CONFLICT';
    } else if (action === 'not_found') {
      badge = 'SIGSEGV UNMAPPED';
    } else if (action === 'found') {
      badge = 'FAULT RESOLVED';
    } else if (title.includes('sys_brk') || title.includes('Heap Expanded') || title.includes('Heap Compacted')) {
      badge = title.includes('Expanded') ? 'HEAP BRK EXTEND' : 'HEAP BRK COMPACT';
    } else if (title.includes('mprotect')) {
      badge = 'MPROTECT W^X';
    } else if (title.includes('Hole Punch')) {
      badge = 'MUNMAP HOLE PUNCH';
    } else if (action === 'delete') {
      badge = 'MUNMAP';
    } else if (action === 'insert') {
      badge = 'MMAP VMA';
    } else if (action === 'compare') {
      badge = 'COMPARE PIVOT';
    } else if (action === 'descend') {
      badge = 'DESCEND';
    } else if (action === 'visit') {
      badge = 'VISITING NODE';
    }

    return { syscall, badge };
  };

  const activeSyscallInfo = getStepSyscallInfo(step, activeOperation);

  return (
    <div className="maple-tree-viz flex-1 flex flex-col w-full h-full bg-transparent text-slate-100 font-sans overflow-hidden select-none">
      
      {/* Top Application Toolbar - Unified Command Strip */}
      <div className="h-[52px] bg-transparent border-b border-slate-800/40 flex items-center justify-between px-4 lg:px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <GitBranch className="w-4 h-4" />
          </div>
          <div className="text-[13px] font-semibold text-slate-100 flex items-center gap-2">
            <span className="hidden sm:inline">Maple Tree Visualizer</span>
            <span className="sm:hidden">Maple Tree</span>
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium hidden sm:inline-flex">
              Linux 6.1+
            </span>
          </div>
          
          <div className="h-4 w-px bg-slate-700/50 mx-2 hidden md:block"></div>
          
          {/* Synchronized Syscall Pill & Telemetry Badge */}
          <div className="hidden md:flex items-center gap-2 font-mono text-[11px]">
            <span className={`px-2 py-0.5 rounded border transition-colors ${
              activeSyscallInfo.badge.includes('CONFLICT') || activeSyscallInfo.badge.includes('SIGSEGV')
                ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                : activeSyscallInfo.badge.includes('System')
                ? 'text-slate-400 border-slate-700/50'
                : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            }`}>
              {activeSyscallInfo.syscall}
            </span>
            <span className="text-slate-500 text-[10px] uppercase font-semibold">
              {activeSyscallInfo.badge}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Operations Drawer Toggle (< lg) */}
          <button
            ref={drawerTriggerRef}
            onClick={() => setIsMobileControlsOpen(true)}
            className="lg:hidden inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-md text-xs font-medium transition-colors shadow-sm cursor-pointer"
            title="Open Memory Operations"
            aria-label="Open Memory Operations"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Operations</span>
          </button>

          {/* Curricular Tracks Dropdown */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <label className="hidden md:block font-medium">Guided Demos:</label>
            <select
              value={scenario}
              onChange={e => handleScenario(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs py-1 px-2 rounded-md outline-none focus:border-emerald-500 cursor-pointer max-w-[140px] sm:max-w-none truncate"
            >
              <option value="" disabled>Select an algorithm demo...</option>
              <optgroup label="Core Mechanics (CS Algorithms)">
                <option value="split_demo">1. Root Split & Height Growth</option>
                <option value="redistribute_demo">2. B* Sibling Balancing (Push L/R)</option>
                <option value="saturation_demo">3. Sibling Saturation → Forced Split</option>
                <option value="cascade_split_demo">4. Cascading Multi-Level Split (O3)</option>
                <option value="delete_demo">5. Deletion, Underflow & Collapse</option>
              </optgroup>
              <optgroup label="Linux Virtual Memory Subsystem">
                <option value="process_vmas">6. 64-Bit ELF Process Address Space</option>
                <option value="page_fault_demo">7. Demand Paging & Page Fault Resolution</option>
                <option value="hole_punch_demo">8. VMA Hole Punch: Munmap Overflow</option>
                <option value="heap_brk_demo">9. Dynamic Heap brk() Expansion/Compaction</option>
              </optgroup>
              <optgroup label="Systems Security & Hardening">
                <option value="aslr_sparsity_demo">10. ASLR & 48-Bit Address Sparsity (45TB)</option>
                <option value="stack_clash_demo">11. Stack Clash & Guard Page (CVE-2017-1000364)</option>
                <option value="jit_mprotect_demo">12. W^X Security & JIT Lifecycle (mprotect)</option>
              </optgroup>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <label className="hidden md:block font-medium">Order:</label>
            <select
              value={order}
              onChange={e => handleReset(parseInt(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs py-1 px-1.5 rounded-md outline-none focus:border-emerald-500 w-12 cursor-pointer"
            >
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
            </select>
          </div>

          <button
            onClick={() => handleReset(order)}
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-md text-xs font-medium transition-colors shadow-sm cursor-pointer"
            title="Clear Tree"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Slide-Over Drawer (< lg) */}
      {isMobileControlsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Memory Operations Drawer"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileControlsOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over Drawer Panel */}
          <div
            ref={drawerRef}
            className="relative w-80 max-w-[85vw] h-full bg-slate-900 border-r border-slate-800 shadow-2xl z-10 flex flex-col"
          >
            <Controls
              isMobile
              onClose={() => setIsMobileControlsOpen(false)}
              onInsert={(lo, hi, label) => {
                handleInsert(lo, hi, label);
                setIsMobileControlsOpen(false);
              }}
              onSearch={(addr) => {
                handleSearch(addr);
                setIsMobileControlsOpen(false);
              }}
              onDelete={(lo, hi) => {
                handleDelete(lo, hi);
                setIsMobileControlsOpen(false);
              }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <Controls
          onInsert={handleInsert}
          onSearch={handleSearch}
          onDelete={handleDelete}
        />

        <main className="flex-1 flex flex-col bg-transparent relative min-w-0">
          {/* D3 Canvas */}
          <div className="flex-1 relative overflow-hidden bg-transparent">
            <TreeCanvas
              ref={canvasRef}
              treeData={currentTreeData}
              highlights={highlights}
              actionClass={actionClass}
              activeSlot={activeSlot}
            />
          </div>

          {/* Bottom Panel: Unified Kernel Inspector & Walkthrough Console */}
          <div className="h-52 bg-slate-900/60 backdrop-blur-md border-t border-slate-800/60 flex flex-col px-5 py-3 gap-2.5 shrink-0 shadow-lg">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  disabled={trace.length === 0 || stepIndex <= 0}
                  onClick={() => handleStep(0)}
                  className="inline-flex items-center justify-center p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-slate-300 transition-colors cursor-pointer"
                  title="First Step"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={trace.length === 0 || stepIndex <= 0}
                  onClick={() => handleStep(stepIndex - 1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-xs text-slate-200 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <span className="text-xs font-mono text-slate-400 min-w-[65px] text-center">
                  {trace.length > 0 ? stepIndex + 1 : 0} / {trace.length}
                </span>
                <button
                  disabled={trace.length === 0 || stepIndex >= trace.length - 1}
                  onClick={() => handleStep(stepIndex + 1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-xs text-slate-200 transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={trace.length === 0 || stepIndex >= trace.length - 1}
                  onClick={() => handleStep(trace.length - 1)}
                  className="inline-flex items-center justify-center p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-slate-300 transition-colors cursor-pointer"
                  title="Last Step"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                
                <div className="h-4 w-px bg-slate-700/50 mx-1"></div>
                
                <button
                  disabled={trace.length === 0}
                  onClick={togglePlay}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    isPlaying
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Auto-play</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Scrub Slider */}
            <div className="w-full">
              <input
                type="range"
                min="0"
                max={Math.max(0, trace.length - 1)}
                value={Math.max(0, stepIndex)}
                onChange={e => handleStep(parseInt(e.target.value))}
                disabled={trace.length === 0}
                aria-label="Trace step scrubber"
                aria-valuetext={trace.length > 0 && step ? `Step ${stepIndex + 1} of ${trace.length}: ${step.title}` : 'No trace steps'}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
              />
            </div>

            {/* Step Content & Insight Callout */}
            <div className="flex gap-4 flex-1 overflow-hidden mt-1">
              {trace.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center text-slate-400 text-sm border border-slate-800/70 border-dashed rounded-xl bg-slate-950/40">
                  <Activity className="w-5 h-5 mb-2 text-slate-500" />
                  <p>Maple Tree initialized (Order {order}). Ready for operations.</p>
                  <p className="text-xs text-slate-500 mt-1">Run a demo or manually map/lookup/unmap regions to trace the algorithm.</p>
                </div>
              ) : (
                <>
                  {/* Algorithmic Step Walkthrough Card */}
                  <div className="flex-1 bg-slate-950/50 border border-slate-800/70 rounded-xl p-3.5 shadow-inner overflow-y-auto flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] tracking-wider uppercase ${`badge-${actionClass}`}`}>
                        {formatActionBadge(actionClass)}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-200">
                        {step?.title}
                      </h3>
                    </div>
                    <div className="text-[13px] leading-relaxed text-slate-300">
                      {step?.description}
                    </div>
                  </div>
                  
                  {/* Kernel Architecture & Syscall Telemetry Card */}
                  <div className="flex-[1.1] bg-slate-950/50 border border-slate-800/70 rounded-xl p-3.5 flex flex-col gap-3 shadow-inner overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                        <Cpu className="w-4 h-4" />
                        <span>Kernel Architecture Insight</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Node {step?.nodeId ?? 0} {step?.activeSlot !== undefined && step.activeSlot >= 0 ? `• slot[${step.activeSlot}]` : ''}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500 font-semibold uppercase text-[10px]">Active Syscall & Intent</span>
                        <span className="text-slate-300 leading-relaxed font-mono text-[11px] text-emerald-400 mb-0.5">
                          {activeSyscallInfo.syscall}
                        </span>
                        <span className="text-slate-300 leading-relaxed">{activeOperation.intent}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500 font-semibold uppercase text-[10px]">Expected Invariant Outcome</span>
                        <span className="text-slate-300 leading-relaxed">{step?.kernelReason || activeOperation.expectedOutcome}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
