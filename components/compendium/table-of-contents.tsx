"use client";

import React, { useEffect, useState } from "react";
import { TocItem } from "@/lib/compendium";
import { List } from "lucide-react";

interface TableOfContentsProps {
    toc: TocItem[];
}

export default function TableOfContents({ toc }: TableOfContentsProps) {
    const [activeId, setActiveId] = useState<string>("");

    useEffect(() => {
        if (toc.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                        break;
                    }
                }
            },
            {
                rootMargin: "-80px 0% -60% 0%",
                threshold: 0.1,
            }
        );

        for (const item of toc) {
            const el = document.getElementById(item.id);
            if (el) {
                observer.observe(el);
            }
        }

        return () => observer.disconnect();
    }, [toc]);

    if (toc.length === 0) return null;

    return (
        <nav className="rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="flex items-center gap-1.5 pb-2.5 mb-2.5 border-b border-slate-800/70 text-xs font-medium text-slate-300">
                <List className="w-3.5 h-3.5 text-slate-400" />
                <span>On This Page</span>
            </div>
            <ul className="space-y-1.5 text-xs">
                {toc.map((item) => {
                    const isActive = activeId === item.id;
                    return (
                        <li
                            key={item.id}
                            className={`${item.level === 3 ? "pl-3.5 border-l border-slate-800/60 ml-1" : ""}`}
                        >
                            <a
                                href={`#${item.id}`}
                                className={`block py-0.5 transition-colors line-clamp-1 ${
                                    isActive
                                        ? "text-emerald-400 font-medium"
                                        : "text-slate-400 hover:text-slate-200"
                                }`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    const el = document.getElementById(item.id);
                                    if (el) {
                                        el.scrollIntoView({ behavior: "smooth" });
                                        history.pushState(null, "", `#${item.id}`);
                                        setActiveId(item.id);
                                    }
                                }}
                            >
                                {item.text}
                            </a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
