import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";
import { codeToHtml } from "shiki";
import katex from "katex";
import { COMPENDIUM_DOMAINS, DomainMeta, normalizeDomain } from "./domains";

const COMPENDIUM_DIR = path.join(process.cwd(), "content", "compendium");

export interface CompendiumPostMeta {
    slug: string;
    title: string;
    created: string;
    formattedDate: string;
    domains: DomainMeta[];
    readingTimeMinutes: number;
    excerpt: string;
    draft: boolean;
    filename: string;
}

export interface TocItem {
    id: string;
    text: string;
    level: 2 | 3;
}

export interface GraphNode {
    id: string;
    label: string;
    type: "current" | "post" | "domain";
    slug?: string;
    url?: string;
}

export interface GraphLink {
    source: string;
    target: string;
    type: "domain" | "mention";
}

export interface PostGraph {
    nodes: GraphNode[];
    links: GraphLink[];
}

export interface CompendiumPost extends CompendiumPostMeta {
    contentHtml: string;
    rawMarkdown: string;
    toc: TocItem[];
    graph: PostGraph;
}

export function slugify(str: string): string {
    return str
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        }
    } catch {
        // Fallback
    }
    return dateStr;
}

/**
 * Returns all raw file paths in content/compendium/
 */
function getCompendiumFiles(): string[] {
    if (!fs.existsSync(COMPENDIUM_DIR)) {
        return [];
    }
    return fs
        .readdirSync(COMPENDIUM_DIR)
        .filter((file) => file.endsWith(".md") && !file.startsWith("."));
}

/**
 * Loads all Compendium post metadata, sorted newest first.
 */
export function getAllPostsMeta(): CompendiumPostMeta[] {
    const files = getCompendiumFiles();
    const posts: CompendiumPostMeta[] = [];

    for (const filename of files) {
        const fullPath = path.join(COMPENDIUM_DIR, filename);
        const fileContent = fs.readFileSync(fullPath, "utf-8");
        const { data, content } = matter(fileContent);

        // Derive title from frontmatter or first heading
        let title = data.title;
        if (!title) {
            const headingMatch = content.match(/^#\s+(.+)$/m);
            title = headingMatch ? headingMatch[1].trim() : filename.replace(/\.md$/, "");
        }

        // Derive slug from explicit frontmatter or filename
        const slug = data.slug || slugify(filename.replace(/\.md$/, ""));

        // Parse domains
        const rawDomains: string[] = Array.isArray(data.domains)
            ? data.domains
            : typeof data.domains === "string"
              ? [data.domains]
              : [];
        const domains: DomainMeta[] = [];
        for (const raw of rawDomains) {
            const resolved = normalizeDomain(raw);
            if (resolved && !domains.some((d) => d.id === resolved.id)) {
                domains.push(resolved);
            }
        }

        // Reading time & excerpt
        const wordCount = content.trim().split(/\s+/).length;
        const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 220));

        // Excerpt: find first meaningful paragraph
        let excerpt = "";
        const cleanContent = content
            .replace(/^#+.*$/gm, "")
            .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, "$2 || $1")
            .replace(/!\[.*?\]\(.*?\)/g, "")
            .trim();
        const paragraphs = cleanContent.split(/\n\s*\n/).filter((p) => p.trim().length > 30);
        if (paragraphs.length > 0) {
            excerpt = paragraphs[0].replace(/\n/g, " ").slice(0, 200).trim();
            if (paragraphs[0].length > 200) excerpt += "…";
        }

        const created = String(data.created || data.date || "1970-01-01");

        posts.push({
            slug,
            title,
            created,
            formattedDate: formatDate(created),
            domains,
            readingTimeMinutes,
            excerpt,
            draft: Boolean(data.draft),
            filename,
        });
    }

    // Sort newest first
    posts.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    return posts;
}

/**
 * Resolves Obsidian wikilinks:
 * - Active: [[Target]] -> [Target](/compendium/target-slug) if target post exists
 * - Anchors: [[Target#Section]] -> [Target](/compendium/target-slug#section)
 * - Private/Unpublished: [[Target]] -> Target (clean text, no dead links)
 * - Aliases: [[Target|Label]] -> [Label](/compendium/target-slug) or Label
 * - Plurals: [[Target]]s -> Targets
 */
export function resolveWikilinks(
    markdown: string,
    allPosts: CompendiumPostMeta[],
    onMention?: (targetSlug: string) => void
): string {
    const WIKILINK_REGEX = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]([a-zA-Z]*)/g;

    return markdown.replace(
        WIKILINK_REGEX,
        (match, targetRaw: string, anchorRaw?: string, labelRaw?: string, suffixRaw?: string) => {
            const target = targetRaw.trim();
            const anchor = anchorRaw ? anchorRaw.trim() : null;
            const label = labelRaw ? labelRaw.trim() : target;
            const suffix = suffixRaw || "";
            const displayText = `${label}${suffix}`;

            // Check if target matches any published post (case-insensitive by title, filename, or slug)
            const targetLower = target.toLowerCase();
            const matchedPost = allPosts.find(
                (p) =>
                    p.title.toLowerCase() === targetLower ||
                    p.filename.replace(/\.md$/, "").toLowerCase() === targetLower ||
                    p.slug === slugify(target)
            );

            if (matchedPost) {
                if (onMention) {
                    onMention(matchedPost.slug);
                }
                const anchorSlug = anchor ? `#${slugify(anchor)}` : "";
                return `[${displayText}](/compendium/${matchedPost.slug}${anchorSlug})`;
            }

            // Target is an unpublished / private vault note: cleanly strip brackets
            return displayText;
        }
    );
}

/**
 * Extracts Table of Contents from markdown headings (H2 & H3)
 */
export function extractToc(markdown: string): TocItem[] {
    const toc: TocItem[] = [];
    const lines = markdown.split("\n");

    for (const line of lines) {
        const match = line.match(/^(#{2,3})\s+(.+)$/);
        if (match) {
            const level = match[1].length as 2 | 3;
            const rawText = match[2].trim();
            // Clean markdown syntax from heading text for TOC display
            const text = rawText
                .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, "$2 || $1")
                .replace(/`([^`]+)`/g, "$1")
                .replace(/[*_]/g, "");
            const id = slugify(text);
            toc.push({ id, text, level });
        }
    }

    return toc;
}

/**
 * Transforms callout syntax (> [!NOTE]) into styled HTML divs
 */
function transformCallouts(markdown: string): string {
    const CALLOUT_REGEX = />\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s+([^\n]*))?\n((?:>[^\n]*\n?)*)/gi;

    return markdown.replace(CALLOUT_REGEX, (match, type, title, body) => {
        const calloutType = type.toLowerCase();
        const calloutTitle = title ? title.trim() : type.toUpperCase();
        const cleanBody = body
            .split("\n")
            .map((line: string) => line.replace(/^>\s?/, ""))
            .join("\n")
            .trim();

        return `<div class="callout callout-${calloutType}">
<div class="callout-header"><span class="callout-icon"></span><span class="callout-title">${calloutTitle}</span></div>
<div class="callout-content">

${cleanBody}

</div>
</div>\n`;
    });
}

/**
 * Compiles mathematical expressions ($...$ and $$...$$) using KaTeX
 */
function transformMath(markdown: string): string {
    // Block math $$...$$
    let result = markdown.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
        try {
            return katex.renderToString(math.trim(), {
                displayMode: true,
                throwOnError: false,
            });
        } catch {
            return match;
        }
    });

    // Inline math $...$ (avoiding currency amounts like $100)
    result = result.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (match, prefix, math) => {
        try {
            const rendered = katex.renderToString(math.trim(), {
                displayMode: false,
                throwOnError: false,
            });
            return `${prefix}${rendered}`;
        } catch {
            return match;
        }
    });

    return result;
}

/**
 * Highlights code blocks using Shiki with a dark slate theme
 */
async function highlightCodeBlocks(markdown: string): Promise<string> {
    const CODE_BLOCK_REGEX = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const matches: Array<{ full: string; lang: string; code: string }> = [];

    let match;
    while ((match = CODE_BLOCK_REGEX.exec(markdown)) !== null) {
        matches.push({
            full: match[0],
            lang: match[1] || "text",
            code: match[2],
        });
    }

    let result = markdown;
    for (const item of matches) {
        let highlighted = "";
        try {
            highlighted = await codeToHtml(item.code, {
                lang: item.lang.toLowerCase() || "text",
                theme: "github-dark-dimmed",
            });
        } catch {
            // Fallback for uncommon or unknown language tokens
            highlighted = `<pre class="shiki github-dark-dimmed"><code>${item.code
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}</code></pre>`;
        }

        const wrapped = `<div class="code-block-wrapper my-6 rounded-lg border border-slate-800 bg-[#1e2227] overflow-hidden">
<div class="code-block-header flex items-center justify-between px-4 py-1.5 bg-slate-900/90 border-b border-slate-800 text-xs font-mono text-slate-400">
<span>${item.lang || "plaintext"}</span>
</div>
<div class="code-block-body text-sm font-mono overflow-x-auto p-4">
${highlighted}
</div>
</div>`;

        result = result.replace(item.full, wrapped);
    }

    return result;
}

/**
 * Loads a single post by slug, compiling markdown and assembling its local concept graph.
 */
export async function getPostBySlug(slug: string): Promise<CompendiumPost | null> {
    const allPosts = getAllPostsMeta();
    const meta = allPosts.find((p) => p.slug === slug);
    if (!meta) return null;

    const fullPath = path.join(COMPENDIUM_DIR, meta.filename);
    if (!fs.existsSync(fullPath)) return null;

    const fileContent = fs.readFileSync(fullPath, "utf-8");
    const { content: rawMarkdown } = matter(fileContent);

    // Track active mentions for graph edges
    const mentionedSlugs = new Set<string>();

    // 1. Resolve wikilinks
    let processed = resolveWikilinks(rawMarkdown, allPosts, (targetSlug) => {
        if (targetSlug !== meta.slug) {
            mentionedSlugs.add(targetSlug);
        }
    });

    // 2. Extract TOC before mutating headings
    const toc = extractToc(processed);

    // 3. Inject heading IDs for smooth anchor jumping
    processed = processed.replace(/^(#{2,3})\s+(.+)$/gm, (match, hashes, text) => {
        const cleanText = text
            .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, "$2 || $1")
            .replace(/`([^`]+)`/g, "$1")
            .replace(/[*_]/g, "");
        const id = slugify(cleanText);
        return `${hashes} <span id="${id}"></span>${text}`;
    });

    // 4. Transform callouts
    processed = transformCallouts(processed);

    // 5. Transform math
    processed = transformMath(processed);

    // 6. Highlight code with Shiki
    processed = await highlightCodeBlocks(processed);

    // 7. Parse remaining markdown into HTML via marked
    const contentHtml = await marked.parse(processed, {
        gfm: true,
        breaks: false,
    });

    // 8. Assemble Local Concept Graph
    const nodes: GraphNode[] = [
        {
            id: meta.slug,
            label: meta.title,
            type: "current",
            slug: meta.slug,
            url: `/compendium/${meta.slug}`,
        },
    ];
    const links: GraphLink[] = [];

    // Add domain hubs
    for (const domain of meta.domains) {
        nodes.push({
            id: domain.id,
            label: domain.name,
            type: "domain",
            url: `/compendium?domain=${domain.slug}`,
        });
        links.push({
            source: meta.slug,
            target: domain.id,
            type: "domain",
        });

        // Add sibling articles sharing this domain
        for (const other of allPosts) {
            if (other.slug === meta.slug) continue;
            if (other.domains.some((d) => d.id === domain.id)) {
                if (!nodes.some((n) => n.id === other.slug)) {
                    nodes.push({
                        id: other.slug,
                        label: other.title,
                        type: "post",
                        slug: other.slug,
                        url: `/compendium/${other.slug}`,
                    });
                }
                if (!links.some((l) => l.source === domain.id && l.target === other.slug)) {
                    links.push({
                        source: domain.id,
                        target: other.slug,
                        type: "domain",
                    });
                }
            }
        }
    }

    // Add direct mention edges
    for (const targetSlug of Array.from(mentionedSlugs)) {
        const targetPost = allPosts.find((p) => p.slug === targetSlug);
        if (targetPost) {
            if (!nodes.some((n) => n.id === targetPost.slug)) {
                nodes.push({
                    id: targetPost.slug,
                    label: targetPost.title,
                    type: "post",
                    slug: targetPost.slug,
                    url: `/compendium/${targetPost.slug}`,
                });
            }
            links.push({
                source: meta.slug,
                target: targetPost.slug,
                type: "mention",
            });
        }
    }

    return {
        ...meta,
        contentHtml,
        rawMarkdown,
        toc,
        graph: { nodes, links },
    };
}
