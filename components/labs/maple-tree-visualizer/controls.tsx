"use client";

import React, { useState } from 'react';
import { Plus, Search, Trash2, Shield, Layers, AlertCircle, X } from 'lucide-react';

export interface ControlsProps {
  onInsert: (lo: number, hi: number, label: string) => void;
  onSearch: (addr: number) => void;
  onDelete: (lo: number, hi: number) => void;
  onClose?: () => void;
  className?: string;
  isMobile?: boolean;
}

export const MAX_SAFE_VADDR = 0x00007fffffffffff; // 128 TB canonical 48-bit user virtual address space
export const MAX_ADDRESS = MAX_SAFE_VADDR;

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

/**
 * Strictly parses and validates hexadecimal address strings within canonical 48-bit user space (<= 128 TB).
 * Strips leading zeros before length validation to allow formatted/padded addresses (e.g. 0x0000000000400000).
 * Rejects non-string, empty, negative, signed, malformed, or out-of-bounds (> 48-bit or > MAX_SAFE_VADDR) values.
 */
export function parseHex(val: string): number | null {
  if (typeof val !== 'string') return null;
  const s = val.trim();
  if (!s) return null;
  if (s.startsWith('-') || s.startsWith('+')) return null;

  // Hex format with 0x prefix
  let hexDigits: string | null = null;
  const hexMatch = s.match(/^0x([0-9a-fA-F]+)$/i);
  if (hexMatch) {
    hexDigits = hexMatch[1];
  } else if (/^[0-9a-fA-F]+$/i.test(s)) {
    // Pure hex digits without 0x prefix
    hexDigits = s;
  }

  if (hexDigits === null) return null;

  // Normalize by stripping leading zeros to evaluate true numerical bit-width
  const normalized = hexDigits.replace(/^0+/, '') || '0';
  // Canonical 48-bit user address space has at most 12 hex digits (<= MAX_SAFE_VADDR: 0x7fffffffffff)
  if (normalized.length > 12) return null;

  const num = Number.parseInt(normalized, 16);
  if (!Number.isSafeInteger(num) || num < 0 || num > MAX_SAFE_VADDR) {
    return null;
  }
  return isValidAddress(num) ? num : null;
}

export function Controls({
  onInsert,
  onSearch,
  onDelete,
  onClose,
  className,
  isMobile = false
}: ControlsProps) {
  const [insertLo, setInsertLo] = useState('');
  const [insertHi, setInsertHi] = useState('');
  const [insertLabel, setInsertLabel] = useState('');
  const [insertError, setInsertError] = useState<string | null>(null);

  const [searchAddr, setSearchAddr] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  const [deleteLo, setDeleteLo] = useState('');
  const [deleteHi, setDeleteHi] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleInsert = (e: React.FormEvent) => {
    e.preventDefault();
    const lo = parseHex(insertLo);
    const hi = parseHex(insertHi);
    const label = insertLabel.trim() || 'VMA';

    if (lo === null) {
      setInsertError('Invalid start address (Lo): enter valid non-negative hex (e.g. 0x1000)');
      return;
    }
    if (hi === null) {
      setInsertError('Invalid end address (Hi): enter valid non-negative hex (e.g. 0x2000)');
      return;
    }
    if (lo > hi) {
      setInsertError(`Inverted range: lo (0x${lo.toString(16)}) > hi (0x${hi.toString(16)})`);
      return;
    }

    setInsertError(null);
    onInsert(lo, hi, label);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const addr = parseHex(searchAddr);
    if (addr === null) {
      setSearchError('Invalid virtual address: enter valid non-negative hex (e.g. 0x1500)');
      return;
    }

    setSearchError(null);
    onSearch(addr);
  };

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    const lo = parseHex(deleteLo);
    if (lo === null) {
      setDeleteError('Invalid start address (Lo): enter valid non-negative hex (e.g. 0x1000)');
      return;
    }

    let hi = 0;
    if (deleteHi.trim().length > 0) {
      const parsedHi = parseHex(deleteHi);
      if (parsedHi === null) {
        setDeleteError('Invalid end address (Hi): enter valid non-negative hex (e.g. 0x2000)');
        return;
      }
      if (lo > parsedHi) {
        setDeleteError(`Inverted range: lo (0x${lo.toString(16)}) > hi (0x${parsedHi.toString(16)})`);
        return;
      }
      hi = parsedHi;
    }

    setDeleteError(null);
    onDelete(lo, hi);
  };

  const parsedInsertLo = parseHex(insertLo);
  const parsedInsertHi = parseHex(insertHi);
  const isInsertInverted = parsedInsertLo !== null && parsedInsertHi !== null && parsedInsertLo > parsedInsertHi;
  const isInsertLoError = insertError !== null && (parsedInsertLo === null || isInsertInverted);
  const isInsertHiError = insertError !== null && (parsedInsertHi === null || isInsertInverted);

  const parsedSearchAddr = parseHex(searchAddr);
  const isSearchAddrError = searchError !== null && parsedSearchAddr === null;

  const parsedDeleteLo = parseHex(deleteLo);
  const isDeleteHiProvided = deleteHi.trim().length > 0;
  const parsedDeleteHi = isDeleteHiProvided ? parseHex(deleteHi) : null;
  const isDeleteInverted = parsedDeleteLo !== null && parsedDeleteHi !== null && parsedDeleteLo > parsedDeleteHi;
  const isDeleteLoError = deleteError !== null && (parsedDeleteLo === null || isDeleteInverted);
  const isDeleteHiError = deleteError !== null && ((isDeleteHiProvided && parsedDeleteHi === null) || isDeleteInverted);

  const idPrefix = isMobile ? 'mobile-' : 'desktop-';

  return (
    <aside
      className={
        className ||
        (isMobile
          ? 'w-full h-full bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto flex flex-col gap-2.5 select-none'
          : 'w-80 bg-slate-900/60 backdrop-blur-md border-r border-slate-800/60 p-4 overflow-y-auto flex flex-col gap-2.5 shrink-0 z-10 hidden lg:flex select-none')
      }
    >
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          Memory Operations
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Close Operations"
            aria-label="Close Operations"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Insert Form */}
      <div className="bg-slate-950/50 border border-slate-800/70 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20"></span>
            <h4 className="text-xs font-semibold text-slate-200">Map Range</h4>
          </div>
          <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            mmap
          </span>
        </div>

        <form onSubmit={handleInsert} className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={`${idPrefix}insert-lo`} className="text-[11px] font-medium text-slate-400">Start (Lo):</label>
              <input
                id={`${idPrefix}insert-lo`}
                type="text"
                value={insertLo}
                onChange={e => {
                  setInsertLo(e.target.value);
                  if (insertError) setInsertError(null);
                }}
                placeholder="0x1000"
                className={`bg-slate-900 border ${
                  isInsertLoError
                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30'
                    : 'border-slate-700/80 focus:border-emerald-500 focus:ring-emerald-500'
                } text-slate-100 p-1.5 rounded-lg text-xs font-mono w-full focus:ring-1 outline-none transition-all placeholder:text-slate-500`}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${idPrefix}insert-hi`} className="text-[11px] font-medium text-slate-400">End (Hi):</label>
              <input
                id={`${idPrefix}insert-hi`}
                type="text"
                value={insertHi}
                onChange={e => {
                  setInsertHi(e.target.value);
                  if (insertError) setInsertError(null);
                }}
                placeholder="0x2000"
                className={`bg-slate-900 border ${
                  isInsertHiError
                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30'
                    : 'border-slate-700/80 focus:border-emerald-500 focus:ring-emerald-500'
                } text-slate-100 p-1.5 rounded-lg text-xs font-mono w-full focus:ring-1 outline-none transition-all placeholder:text-slate-500`}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${idPrefix}insert-label`} className="text-[11px] font-medium text-slate-400">VMA Tag / Descriptor:</label>
            <input
              id={`${idPrefix}insert-label`}
              type="text"
              value={insertLabel}
              onChange={e => {
                setInsertLabel(e.target.value);
                if (insertError) setInsertError(null);
              }}
              placeholder="[heap]"
              className="bg-slate-900 border border-slate-700/80 text-slate-100 p-1.5 rounded-lg text-xs font-mono w-full focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-500"
              required
            />
          </div>

          {insertError && (
            <div role="alert" className="flex items-start gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 leading-tight">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
              <span>{insertError}</span>
            </div>
          )}

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 w-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-500 font-medium mt-1 py-1.5 px-3 rounded-lg text-xs transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Allocate VMA
          </button>
        </form>
      </div>

      {/* Search Form */}
      <div className="bg-slate-950/50 border border-slate-800/70 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 ring-2 ring-sky-500/20"></span>
            <h4 className="text-xs font-semibold text-slate-200">Lookup Address</h4>
          </div>
          <span className="text-[10px] font-mono text-sky-400/90 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
            page_fault
          </span>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${idPrefix}search-addr`} className="text-[11px] font-medium text-slate-400">Virtual Address:</label>
            <input
              id={`${idPrefix}search-addr`}
              type="text"
              value={searchAddr}
              onChange={e => {
                setSearchAddr(e.target.value);
                if (searchError) setSearchError(null);
              }}
              placeholder="0x1500"
              className={`bg-slate-900 border ${
                isSearchAddrError
                  ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30'
                  : 'border-slate-700/80 focus:border-sky-500 focus:ring-sky-500'
              } text-slate-100 p-1.5 rounded-lg text-xs font-mono w-full focus:ring-1 outline-none transition-all placeholder:text-slate-500`}
              required
            />
          </div>

          {searchError && (
            <div role="alert" className="flex items-start gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 leading-tight">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
              <span>{searchError}</span>
            </div>
          )}

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 w-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-500 font-medium mt-1 py-1.5 px-3 rounded-lg text-xs transition-all shadow-sm cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            Resolve Address
          </button>
        </form>
      </div>

      {/* Delete Form */}
      <div className="bg-slate-950/50 border border-slate-800/70 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 ring-2 ring-rose-500/20"></span>
            <h4 className="text-xs font-semibold text-slate-200">Delete Range</h4>
          </div>
          <span className="text-[10px] font-mono text-rose-400/90 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
            munmap
          </span>
        </div>

        <form onSubmit={handleDelete} className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={`${idPrefix}delete-lo`} className="text-[11px] font-medium text-slate-400">Start (Lo):</label>
              <input
                id={`${idPrefix}delete-lo`}
                type="text"
                value={deleteLo}
                onChange={e => {
                  setDeleteLo(e.target.value);
                  if (deleteError) setDeleteError(null);
                }}
                placeholder="0x1000"
                className={`bg-slate-900 border ${
                  isDeleteLoError
                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30'
                    : 'border-slate-700/80 focus:border-rose-400 focus:ring-rose-500/50'
                } text-slate-100 p-1.5 rounded-lg text-xs font-mono w-full focus:ring-1 outline-none transition-all placeholder:text-slate-500`}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${idPrefix}delete-hi`} className="text-[11px] font-medium text-slate-400">End (Hi):</label>
              <input
                id={`${idPrefix}delete-hi`}
                type="text"
                value={deleteHi}
                onChange={e => {
                  setDeleteHi(e.target.value);
                  if (deleteError) setDeleteError(null);
                }}
                placeholder="0x2000"
                className={`bg-slate-900 border ${
                  isDeleteHiError
                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30'
                    : 'border-slate-700/80 focus:border-rose-400 focus:ring-rose-500/50'
                } text-slate-100 p-1.5 rounded-lg text-xs font-mono w-full focus:ring-1 outline-none transition-all placeholder:text-slate-500`}
              />
            </div>
          </div>

          {deleteError && (
            <div role="alert" className="flex items-start gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 leading-tight">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
              <span>{deleteError}</span>
            </div>
          )}

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 w-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-500 font-medium mt-1 py-1.5 px-3 rounded-lg text-xs transition-all shadow-sm cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Unmap Range
          </button>
        </form>
      </div>

      {/* Kernel Invariants Reference Card */}
      <div className="bg-slate-950/50 border border-slate-800/70 rounded-xl p-3 text-xs text-slate-400 mt-auto">
        <h4 className="font-semibold text-slate-300 uppercase tracking-wider mb-2 text-[10px] flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          Structural Invariants
        </h4>
        <ul className="flex flex-col gap-1.5 text-[11px] leading-relaxed">
          <li className="flex items-start gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 bg-sky-400"></span>
            <span>
              <strong className="text-slate-200">Pivots:</strong> Inclusive upper boundary routing limits.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 bg-emerald-400"></span>
            <span>
              <strong className="text-slate-200">Leaves:</strong> Strictly non-overlapping contiguous VMAs.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 bg-purple-400"></span>
            <span>
              <strong className="text-slate-200">B* Policy:</strong> Sibling balancing before node allocation.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 bg-cyan-400"></span>
            <span>
              <strong className="text-slate-200">RCU Safety:</strong> Lockless concurrent read traversal.
            </span>
          </li>
        </ul>
      </div>
    </aside>
  );
}
