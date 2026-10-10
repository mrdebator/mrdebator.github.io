"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { CompendiumPostMeta } from "@/lib/compendium";
import { DomainMeta } from "@/lib/domains";
import { Calendar, Clock, ArrowRight, BookOpen, Layers } from "lucide-react";

interface CompendiumClientPageProps {
    initialPosts: CompendiumPostMeta[];
    domainsWithCounts: Array<{ domain: DomainMeta; count: number }>;
}

export default function CompendiumClientPage({
    initialPosts,
    domainsWithCounts,
}: CompendiumClientPageProps) {
    const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

    const filteredPosts = useMemo(() => {
        if (!selectedDomain) return initialPosts;
        return initialPosts.filter((post) =>
            post.domains.some((d) => d.slug === selectedDomain || d.id === selectedDomain)
        );
    }, [initialPosts, selectedDomain]);

    return (
        <div className="space-y-10">
            {/* Domain Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                    onClick={() => setSelectedDomain(null)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedDomain === null
                            ? "bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20"
                            : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80"
                    }`}
                >
                    <Layers className="w-3 h-3" />
                    <span>All Domains ({initialPosts.length})</span>
                </button>

                {domainsWithCounts.map(({ domain, count }) => {
                    const isSelected = selectedDomain === domain.slug;
                    return (
                        <button
                            key={domain.id}
                            onClick={() => setSelectedDomain(isSelected ? null : domain.slug)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                isSelected
                                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                                    : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80"
                            }`}
                        >
                            <span>{domain.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800/80 text-slate-300">
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Post Stream */}
            <div className="space-y-6">
                {filteredPosts.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                        <BookOpen className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">No notes found for this domain category.</p>
                    </div>
                ) : (
                    filteredPosts.map((post) => (
                        <article
                            key={post.slug}
                            className="group relative rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700/80 transition-all p-6 shadow-sm hover:shadow-md backdrop-blur-sm"
                        >
                            {/* Domain badges */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                {post.domains.map((d) => (
                                    <button
                                        key={d.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDomain(d.slug);
                                        }}
                                        className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-blue-950/60 border border-blue-800/50 text-blue-300 hover:bg-blue-900/60 hover:text-blue-200 transition-colors"
                                    >
                                        {d.name}
                                    </button>
                                ))}
                            </div>

                            {/* Title */}
                            <h2 className="text-xl font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors mb-2">
                                <Link href={`/compendium/${post.slug}`} className="focus:outline-none">
                                    <span className="absolute inset-0" aria-hidden="true" />
                                    {post.title}
                                </Link>
                            </h2>

                            {/* Excerpt */}
                            {post.excerpt && (
                                <p className="text-slate-400 text-sm leading-relaxed mb-4 line-clamp-2">
                                    {post.excerpt}
                                </p>
                            )}

                            {/* Meta footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs text-slate-500 font-mono">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {post.formattedDate}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        {post.readingTimeMinutes} min read
                                    </span>
                                </div>
                                <span className="inline-flex items-center gap-1 text-slate-400 group-hover:text-emerald-400 transition-colors font-sans text-xs font-medium">
                                    Read Note
                                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                            </div>
                        </article>
                    ))
                )}
            </div>
        </div>
    );
}
