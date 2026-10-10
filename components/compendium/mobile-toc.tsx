"use client";

import React, { useState } from "react";
import { TocItem } from "@/lib/compendium";
import { List, ChevronDown } from "lucide-react";

interface MobileTocProps {
    toc: TocItem[];
}

export default function MobileTableOfContents({ toc }: MobileTocProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!toc || toc.length === 0) return null;

    return (
        <div className="lg:hidden mb-8 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-slate-300 hover:text-slate-100 transition-colors"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-emerald-400" />
                    <span>On This Page ({toc.length})</span>
                </div>
                <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                    }`}
                />
            </button>

            {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800/60">
                    <ul className="space-y-2 text-xs">
                        {toc.map((item) => (
                            <li
                                key={item.id}
                                className={item.level === 3 ? "pl-3.5 border-l border-slate-800/60 ml-1" : ""}
                            >
                                <a
                                    href={`#${item.id}`}
                                    className="block py-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsOpen(false);
                                        const el = document.getElementById(item.id);
                                        if (el) {
                                            el.scrollIntoView({ behavior: "smooth" });
                                            history.pushState(null, "", `#${item.id}`);
                                        }
                                    }}
                                >
                                    {item.text}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
