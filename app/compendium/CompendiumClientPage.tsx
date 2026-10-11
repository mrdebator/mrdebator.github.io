"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CompendiumPostMeta } from "@/lib/compendium";
import { DomainMeta } from "@/lib/domains";
import { Calendar, Clock, ArrowRight, BookOpen, Layers, Search, X } from "lucide-react";

interface CompendiumClientPageProps {
    initialPosts: CompendiumPostMeta[];
    domainsWithCounts: Array<{ domain: DomainMeta; count: number }>;
}

export default function CompendiumClientPage({
    initialPosts,
    domainsWithCounts,
}: CompendiumClientPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const domainParam = searchParams.get("domain");
    const [selectedDomain, setSelectedDomain] = useState<string | null>(domainParam);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        setSelectedDomain(domainParam);
    }, [domainParam]);

    const handleSelectDomain = (slug: string | null) => {
        setSelectedDomain(slug);
        const params = new URLSearchParams(searchParams.toString());
        if (slug) {
            params.set("domain", slug);
        } else {
            params.delete("domain");
        }
        const queryStr = params.toString();
        const nextUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
        router.replace(nextUrl, { scroll: false });
    };

    const filteredPosts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return initialPosts.filter((post) => {
            const matchesDomain =
                !selectedDomain ||
                post.domains.some((d) => d.slug === selectedDomain || d.id === selectedDomain);
            if (!matchesDomain) return false;

            if (!query) return true;

            const matchesTitle = post.title.toLowerCase().includes(query);
            const matchesExcerpt = post.excerpt ? post.excerpt.toLowerCase().includes(query) : false;
            const matchesContent = post.content ? post.content.toLowerCase().includes(query) : false;
            const matchesDomains = post.domains.some((d) => d.name.toLowerCase().includes(query));

            return matchesTitle || matchesExcerpt || matchesContent || matchesDomains;
        });
    }, [initialPosts, selectedDomain, searchQuery]);

    return (
        <div className="space-y-8">
            {/* Instant Search Bar */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search notes by title, topic, or content..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all backdrop-blur-sm"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                        title="Clear search"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Domain Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={() => handleSelectDomain(null)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedDomain === null
                            ? "bg-slate-700 text-white"
                            : "bg-slate-900/80 text-gray-400 hover:text-white hover:bg-slate-800 border border-slate-800/80"
                    }`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    <span>All Domains ({initialPosts.length})</span>
                </button>

                {domainsWithCounts.map(({ domain, count }) => {
                    const isSelected = selectedDomain === domain.slug || selectedDomain === domain.id;
                    return (
                        <button
                            key={domain.id}
                            onClick={() => handleSelectDomain(isSelected ? null : domain.slug)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                isSelected
                                    ? "bg-slate-700 text-white"
                                    : "bg-slate-900/80 text-gray-400 hover:text-white hover:bg-slate-800 border border-slate-800/80"
                            }`}
                        >
                            <span>{domain.name}</span>
                            <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                    isSelected
                                        ? "bg-slate-600 text-slate-200"
                                        : "bg-slate-800/80 text-slate-400"
                                }`}
                            >
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
                        <p className="text-slate-400 text-sm">
                            {searchQuery
                                ? `No notes found matching "${searchQuery}".`
                                : "No notes found for this domain category."}
                        </p>
                    </div>
                ) : (
                    filteredPosts.map((post) => (
                        <article
                            key={post.slug}
                            className="group relative rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700/80 transition-all p-6 shadow-sm hover:shadow-md backdrop-blur-sm"
                        >
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
                            <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs text-slate-500">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {post.formattedDate}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        {post.readingTimeMinutes} min read
                                    </span>
                                    {post.domains.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-600 hidden sm:inline">•</span>
                                            {post.domains.map((d) => (
                                                <button
                                                    key={d.id}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        handleSelectDomain(d.slug);
                                                    }}
                                                    className="relative z-10 text-slate-400 hover:text-white underline-offset-4 hover:underline transition-colors"
                                                >
                                                    {d.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <span className="inline-flex items-center gap-1 text-slate-400 group-hover:text-emerald-400 transition-colors text-xs font-medium flex-shrink-0">
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
