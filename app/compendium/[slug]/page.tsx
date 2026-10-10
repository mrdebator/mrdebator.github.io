import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllPostsMeta, getPostBySlug } from "@/lib/compendium";
import MiniMap from "@/components/compendium/mini-map";
import TableOfContents from "@/components/compendium/table-of-contents";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import "katex/dist/katex.min.css";

interface PageProps {
    params: {
        slug: string;
    };
}

export async function generateStaticParams() {
    const posts = getAllPostsMeta();
    return posts.map((post) => ({
        slug: post.slug,
    }));
}

export async function generateMetadata({ params }: PageProps) {
    const post = await getPostBySlug(params.slug);
    if (!post) {
        return {
            title: "Note Not Found | Compendium",
        };
    }

    return {
        title: `${post.title} | Compendium`,
        description: post.excerpt,
        openGraph: {
            title: `${post.title} | Compendium`,
            description: post.excerpt,
            type: "article",
            publishedTime: post.created,
            authors: ["Ansh"],
        },
    };
}

export default async function CompendiumArticlePage({ params }: PageProps) {
    const post = await getPostBySlug(params.slug);

    if (!post) {
        notFound();
    }

    // JSON-LD structured data for search crawlers & LLM citation
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: post.title,
        description: post.excerpt,
        datePublished: post.created,
        author: {
            "@type": "Person",
            name: "Ansh",
            url: "https://anshc.me",
        },
        publisher: {
            "@type": "Person",
            name: "Ansh",
        },
        about: post.domains.map((d) => d.name),
    };

    return (
        <article className="max-w-6xl mx-auto px-4 py-8 md:py-12">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Back link */}
            <div className="mb-6">
                <Link
                    href="/compendium"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-emerald-400 transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Compendium
                </Link>
            </div>

            {/* Article Header (Clean, styled - zero raw YAML) */}
            <header className="mb-10 pb-8 border-b border-slate-800/80">
                {/* Domain badges */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {post.domains.map((d) => (
                        <Link
                            key={d.id}
                            href={`/compendium?domain=${d.slug}`}
                            className="text-xs font-mono px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 text-blue-300 hover:bg-blue-900/60 hover:text-blue-100 transition-colors"
                        >
                            {d.name}
                        </Link>
                    ))}
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-slate-100 mb-4 leading-tight">
                    {post.title}
                </h1>

                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {post.formattedDate}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {post.readingTimeMinutes} min read
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">By Ansh</span>
                </div>
            </header>

            {/* Main Content Layout with Desktop Sticky Rail */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left/Center Column: Rendered Prose */}
                <div className="lg:col-span-8 min-w-0">
                    <div
                        className="compendium-content prose prose-slate dark:prose-invert max-w-none 
                        prose-headings:text-slate-100 prose-headings:font-semibold prose-headings:scroll-mt-24
                        prose-h1:hidden prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-slate-800/70 prose-h2:pb-2
                        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                        prose-p:text-slate-300 prose-p:leading-relaxed
                        prose-li:text-slate-300
                        prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
                        prose-code:text-emerald-300 prose-code:bg-slate-900/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-slate-800 prose-code:before:content-none prose-code:after:content-none
                        prose-strong:text-slate-100 prose-strong:font-semibold
                        prose-blockquote:border-l-emerald-500 prose-blockquote:text-slate-400 prose-blockquote:italic
                        prose-hr:border-slate-800"
                        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
                    />

                    {/* Bottom Back Button */}
                    <div className="mt-16 pt-8 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                        <Link
                            href="/compendium"
                            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Return to Compendium
                        </Link>
                        <span className="text-slate-500">anshc.me / compendium</span>
                    </div>
                </div>

                {/* Right Rail: Interactive D3 Mini-Map + Table of Contents */}
                <aside className="hidden lg:block lg:col-span-4">
                    <div className="sticky top-24 space-y-6">
                        {/* Concept Mini-Map */}
                        <MiniMap graph={post.graph} currentTitle={post.title} />

                        {/* Table of Contents */}
                        <TableOfContents toc={post.toc} />
                    </div>
                </aside>
            </div>
        </article>
    );
}
