import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";
import { visit, SKIP } from "unist-util-visit";
import GithubSlugger from "github-slugger";
import { DomainMeta, normalizeDomain } from "./domains";

const COMPENDIUM_DIR = path.join(process.cwd(), "content", "compendium");

export interface CompendiumPostMeta {
    slug: string;
    title: string;
    created: string;
    formattedDate: string;
    domains: DomainMeta[];
    readingTimeMinutes: number;
    excerpt: string;
    rawContent?: string;
    content?: string;
    aliases?: string[];
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

/**
 * Slugifies in-page anchors and section references using GithubSlugger conventions.
 */
export function slugifyAnchor(anchor: string): string {
    return new GithubSlugger().slug(anchor);
}

/**
 * Strips wikilink syntax into plain text adhering strictly to the approved precedence rules:
 * - Unpublished with anchor: [[Windows#Memory Integrity]] -> "Windows Memory Integrity"
 * - Unpublished with anchor + alias: [[Windows#Memory Integrity|HVCI]] -> "Windows Memory Integrity (HVCI)"
 * - Unpublished with alias (no anchor): [[Windows|Win11]] -> "Windows" (target preserved, alias dropped)
 * - Unpublished without anchor/alias: [[Windows]] -> "Windows"
 * - Internal section jump: [[#Section]] -> "Section"
 * - Internal section jump with alias: [[#Section|Custom]] -> "Custom"
 */
export function cleanWikilinksToText(markdown: string): string {
    return markdown.replace(
        /\[\[([^\]|#]*)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]([a-zA-Z]*)/g,
        (_match, targetRaw?: string, anchorRaw?: string, aliasRaw?: string, suffixRaw?: string) => {
            const target = (targetRaw || "").trim();
            const anchor = anchorRaw ? anchorRaw.trim() : null;
            const alias = aliasRaw ? aliasRaw.trim() : null;
            const suffix = suffixRaw || "";

            // Internal jump [[#Section]]
            if (!target && anchor) {
                return `${alias || anchor}${suffix}`;
            }

            // Target + Anchor (+ Alias)
            if (anchor) {
                if (alias) {
                    return `${target} ${anchor} (${alias})${suffix}`;
                }
                return `${target} ${anchor}${suffix}`;
            }

            // Target strictly preserved; alias dropped
            return `${target}${suffix}`;
        }
    );
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

let cachedPostsMeta: CompendiumPostMeta[] | null = null;

/**
 * Loads all Compendium post metadata, sorted newest first.
 * Dual-tier caching: bypasses cache in development for Fast Refresh;
 * memoizes frozen array in production for O(N) SSG build disk I/O.
 */
export function getAllPostsMeta(): CompendiumPostMeta[] {
    if (process.env.NODE_ENV === "production" && cachedPostsMeta) {
        return cachedPostsMeta;
    }

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

        // Parse aliases
        const rawAliases: string[] = Array.isArray(data.aliases)
            ? data.aliases
            : typeof data.aliases === "string"
              ? [data.aliases]
              : [];

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

        // Excerpt & Clean Content: strip markdown syntax cleanly according to approved precedence rules
        let excerpt = "";
        const cleanContent = cleanWikilinksToText(
            content
                .replace(/^#+.*$/gm, "")
                .replace(/!\[.*?\]\(.*?\)/g, "")
                .trim()
        );
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
            rawContent: content,
            content: cleanContent,
            aliases: rawAliases,
            draft: Boolean(data.draft),
            filename,
        });
    }

    // Sort newest first
    posts.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    if (process.env.NODE_ENV === "production") {
        cachedPostsMeta = Object.freeze([...posts]) as CompendiumPostMeta[];
    }

    return posts;
}

/**
 * Remark Plugin: Transforms Obsidian wikilinks into clean hyperlinks or plain text
 * according to approved precedence rules:
 * - Unpublished with anchor: [[Windows#Memory Integrity]] -> "Windows Memory Integrity"
 * - Unpublished with anchor + alias: [[Windows#Memory Integrity|HVCI]] -> "Windows Memory Integrity (HVCI)"
 * - Unpublished with alias (no anchor): [[Windows|Win11]] -> "Windows" (target preserved, alias dropped)
 * - Unpublished without anchor/alias: [[Windows]] -> "Windows"
 * - Published with anchor: [[Windows#Memory Integrity]] -> [Windows Memory Integrity](/compendium/windows#memory-integrity)
 * - Published with anchor + alias: [[Windows#Memory Integrity|HVCI]] -> [Windows Memory Integrity (HVCI)](/compendium/windows#memory-integrity)
 * - Published with alias (no anchor): [[Windows|Win11]] -> [Windows](/compendium/windows)
 * - Published without anchor/alias: [[Windows]] -> [Windows](/compendium/windows)
 * - Internal section jumps: [[#Section]] -> [Section](#section)
 * - Frontmatter aliases: Target note aliases: [...] supported during lookup
 */
export function remarkWikilinks(allPosts: CompendiumPostMeta[], onMention?: (slug: string) => void) {
    return (tree: any) => {
        visit(tree, "text", (node: any, index: any, parent: any) => {
            if (!node.value || !node.value.includes("[[")) return;
            const WIKILINK_REGEX = /\[\[([^\]|#]*)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]([a-zA-Z]*)/g;
            const newNodes: any[] = [];
            let lastIndex = 0;
            let match;

            while ((match = WIKILINK_REGEX.exec(node.value)) !== null) {
                const matchStart = match.index;
                const matchEnd = WIKILINK_REGEX.lastIndex;

                if (matchStart > lastIndex) {
                    newNodes.push({
                        type: "text",
                        value: node.value.slice(lastIndex, matchStart),
                    });
                }

                const targetRaw = (match[1] || "").trim();
                const anchorRaw = match[2] ? match[2].trim() : null;
                const aliasRaw = match[3] ? match[3].trim() : null;
                const suffix = match[4] || "";

                // Internal section jump: [[#Section]]
                if (!targetRaw && anchorRaw) {
                    const text = `${aliasRaw || anchorRaw}${suffix}`;
                    newNodes.push({
                        type: "link",
                        url: `#${slugifyAnchor(anchorRaw)}`,
                        children: [{ type: "text", value: text }],
                    });
                    lastIndex = matchEnd;
                    continue;
                }

                // Target note lookup (by title, filename, slug, or frontmatter aliases)
                const targetLower = targetRaw.toLowerCase();
                const targetSlug = slugify(targetRaw);
                const matchedPost = allPosts.find(
                    (p) =>
                        p.title.toLowerCase() === targetLower ||
                        (p.filename && p.filename.replace(/\.md$/, "").toLowerCase() === targetLower) ||
                        p.slug === targetSlug ||
                        (p.aliases &&
                            p.aliases.some(
                                (a: string) =>
                                    a.toLowerCase() === targetLower || slugify(a) === targetSlug
                            ))
                );

                if (matchedPost) {
                    if (onMention) {
                        onMention(matchedPost.slug);
                    }
                    let displayText = "";
                    let href = `/compendium/${matchedPost.slug}`;

                    if (anchorRaw) {
                        href += `#${slugifyAnchor(anchorRaw)}`;
                        if (aliasRaw) {
                            displayText = `${targetRaw} ${anchorRaw} (${aliasRaw})${suffix}`;
                        } else {
                            displayText = `${targetRaw} ${anchorRaw}${suffix}`;
                        }
                    } else {
                        // Target strictly preserved; alias dropped
                        displayText = `${targetRaw}${suffix}`;
                    }

                    newNodes.push({
                        type: "link",
                        url: href,
                        children: [{ type: "text", value: displayText }],
                    });
                } else {
                    // Unpublished / private vault note: cleanly stripped plain text
                    let displayText = "";
                    if (anchorRaw) {
                        if (aliasRaw) {
                            displayText = `${targetRaw} ${anchorRaw} (${aliasRaw})${suffix}`;
                        } else {
                            displayText = `${targetRaw} ${anchorRaw}${suffix}`;
                        }
                    } else {
                        // Target strictly preserved; alias dropped
                        displayText = `${targetRaw}${suffix}`;
                    }

                    newNodes.push({
                        type: "text",
                        value: displayText,
                    });
                }

                lastIndex = matchEnd;
            }

            if (lastIndex < node.value.length) {
                newNodes.push({
                    type: "text",
                    value: node.value.slice(lastIndex),
                });
            }

            if (newNodes.length > 0 && parent && typeof index === "number") {
                parent.children.splice(index, 1, ...newNodes);
                return index + newNodes.length;
            }
        });
    };
}

/**
 * Remark Plugin: Transforms Obsidian callouts (> [!NOTE], > [!WARNING], etc.) into styled containers
 */
function remarkCallouts() {
    return (tree: any) => {
        visit(tree, "blockquote", (node: any) => {
            if (!node.children || node.children.length === 0) return;
            const firstChild = node.children[0];
            if (firstChild.type !== "paragraph" || !firstChild.children || firstChild.children.length === 0) return;
            const firstText = firstChild.children[0];
            if (firstText.type !== "text") return;

            const match = firstText.value.match(
                /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s+([^\n]*))?(?:\n([\s\S]*))?$/i
            );
            if (!match) return;

            const type = match[1].toLowerCase();
            const title = (match[2] || match[1]).trim();
            const remaining = match[3] || "";

            if (remaining) {
                firstText.value = remaining;
            } else {
                firstChild.children.shift();
            }

            node.data = node.data || {};
            node.data.hName = "div";
            node.data.hProperties = {
                className: ["callout", "not-prose", `callout-${type}`],
            };

            const headerNode = {
                type: "paragraph",
                data: {
                    hName: "div",
                    hProperties: { className: ["callout-header"] },
                },
                children: [
                    { type: "strong", data: { hName: "span", hProperties: { className: ["callout-title"] } }, children: [{ type: "text", value: title }] },
                ],
            };

            node.children.unshift(headerNode);
        });
    };
}

function hasHyperlink(node: any): boolean {
    if (!node) return false;
    if (node.type === "link") return true;
    if (node.type === "html" && /<a\s/i.test(node.value || "")) return true;
    if (Array.isArray(node.children)) {
        return node.children.some(hasHyperlink);
    }
    return false;
}

function getHeadingText(node: any): string {
    let text = "";
    visit(node, "text", (tNode: any) => {
        text += tNode.value || "";
    });
    return text.trim();
}

/**
 * Remark Plugin: Strips document-level H1 headings from the markdown body AST.
 * The article header template already renders the canonical H1 title, preventing
 * phantom hidden DOM elements that break :first-child CSS margin collapse.
 */
export function remarkStripDocumentH1() {
    return (tree: any) => {
        if (!tree || !Array.isArray(tree.children)) return;
        tree.children = tree.children.filter(
            (node: any) => node.type !== "heading" || (node.depth !== 1)
        );
    };
}

/**
 * Remark Plugin: Prunes non-hyperlinked references from the "References" section.
 * Strips out unlinked plain text or unresolved wikilinks in reference lists.
 * If all references in the section are unlinked, prunes the heading and section entirely.
 */
export function remarkPruneReferences() {
    return (tree: any) => {
        if (!tree || !Array.isArray(tree.children)) return;

        let i = 0;
        while (i < tree.children.length) {
            const node = tree.children[i];
            if (node.type === "heading") {
                const headingText = getHeadingText(node);
                if (/^references$/i.test(headingText)) {
                    const headingDepth = node.depth || 2;
                    let j = i + 1;
                    const sectionIndicesToRemove: number[] = [];
                    let hasRemainingHyperlinks = false;

                    while (j < tree.children.length) {
                        const sibling = tree.children[j];
                        if (sibling.type === "heading" && (sibling.depth || 2) <= headingDepth) {
                            break;
                        }

                        if (sibling.type === "list") {
                            if (Array.isArray(sibling.children)) {
                                sibling.children = sibling.children.filter((listItem: any) =>
                                    hasHyperlink(listItem)
                                );
                            }
                            if (!sibling.children || sibling.children.length === 0) {
                                sectionIndicesToRemove.push(j);
                            } else {
                                hasRemainingHyperlinks = true;
                            }
                        } else if (sibling.type === "paragraph") {
                            if (!hasHyperlink(sibling)) {
                                sectionIndicesToRemove.push(j);
                            } else {
                                hasRemainingHyperlinks = true;
                            }
                        } else {
                            sectionIndicesToRemove.push(j);
                        }

                        j++;
                    }

                    // Remove backwards so earlier indices don't shift
                    for (let r = sectionIndicesToRemove.length - 1; r >= 0; r--) {
                        tree.children.splice(sectionIndicesToRemove[r], 1);
                    }

                    // If no hyperlinked references remain, prune the heading itself
                    if (!hasRemainingHyperlinks) {
                        tree.children.splice(i, 1);
                        continue;
                    }
                }
            }
            i++;
        }
    };
}

/**
 * Rehype Plugin: Extracts Table of Contents entries directly from heading elements
 * whose IDs have been assigned by rehypeSlug, guaranteeing 100% ID synchronicity.
 */
function rehypeExtractToc(tocCollector: TocItem[]) {
    return (tree: any) => {
        visit(tree, "element", (node: any) => {
            if (node.tagName === "h2" || node.tagName === "h3") {
                const level = node.tagName === "h2" ? 2 : 3;
                let headingText = "";
                visit(node, "text", (tNode: any) => {
                    headingText += tNode.value || "";
                });
                const cleanText = headingText.trim();
                const id = String(node.properties?.id || "");
                tocCollector.push({ id, text: cleanText, level });
            }
        });
    };
}

/**
 * Rehype Plugin: Wraps display KaTeX equations in overflow-x-auto for mobile responsiveness
 */
function rehypeWrapKatex() {
    return (tree: any) => {
        visit(tree, "element", (node: any, index: any, parent: any) => {
            if (
                node.tagName === "span" &&
                node.properties?.className &&
                Array.isArray(node.properties.className) &&
                node.properties.className.includes("katex-display")
            ) {
                const wrapper = {
                    type: "element",
                    tagName: "div",
                    properties: {
                        className: ["katex-wrapper", "not-prose", "overflow-x-auto", "my-4", "py-2"],
                    },
                    children: [node],
                };
                if (parent && typeof index === "number") {
                    parent.children[index] = wrapper;
                    return [SKIP, index + 1];
                }
            }
        });
    };
}

/**
 * Rehype Plugin: Wraps Shiki code blocks in styled containers with language label and copy button
 */
function rehypeWrapCodeBlocks() {
    return (tree: any) => {
        visit(tree, "element", (node: any, index: any, parent: any) => {
            if (node.tagName === "pre") {
                const lang = String(node.properties?.["data-lang"] || "plaintext");
                const wrapper = {
                    type: "element",
                    tagName: "div",
                    properties: {
                        className: [
                            "code-block-wrapper",
                            "not-prose",
                            "my-6",
                            "rounded-lg",
                            "border",
                            "border-slate-800",
                            "bg-[#1e2227]",
                            "overflow-hidden",
                        ],
                    },
                    children: [
                        {
                            type: "element",
                            tagName: "div",
                            properties: {
                                className: [
                                    "code-block-header",
                                    "flex",
                                    "items-center",
                                    "justify-between",
                                    "px-4",
                                    "py-1.5",
                                    "bg-slate-900/90",
                                    "border-b",
                                    "border-slate-800",
                                    "text-xs",
                                    "font-mono",
                                    "text-slate-400",
                                ],
                            },
                            children: [
                                {
                                    type: "element",
                                    tagName: "span",
                                    properties: {},
                                    children: [{ type: "text", value: lang }],
                                },
                                {
                                    type: "element",
                                    tagName: "button",
                                    properties: {
                                        type: "button",
                                        className: [
                                            "copy-code-btn",
                                            "inline-flex",
                                            "items-center",
                                            "gap-1",
                                            "text-slate-400",
                                            "hover:text-slate-200",
                                            "transition-colors",
                                            "cursor-pointer",
                                        ],
                                        "aria-label": "Copy code to clipboard",
                                    },
                                    children: [
                                        {
                                            type: "element",
                                            tagName: "span",
                                            properties: { className: ["copy-text"] },
                                            children: [{ type: "text", value: "Copy" }],
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            type: "element",
                            tagName: "div",
                            properties: {
                                className: ["code-block-body", "text-sm", "font-mono", "overflow-x-auto", "p-4"],
                            },
                            children: [node],
                        },
                    ],
                };
                if (parent && typeof index === "number") {
                    parent.children[index] = wrapper;
                    return [SKIP, index + 1];
                }
            }
        });
    };
}

/**
 * Extracts Table of Contents from markdown headings (H2 & H3) using GithubSlugger
 */
export function extractToc(markdown: string): TocItem[] {
    const slugger = new GithubSlugger();
    const toc: TocItem[] = [];
    const lines = markdown.split("\n");

    for (const line of lines) {
        const match = line.match(/^(#{2,3})\s+(.+)$/);
        if (match) {
            const level = match[1].length as 2 | 3;
            const rawText = match[2].trim();
            const text = rawText
                .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, "$1")
                .replace(/`([^`]+)`/g, "$1")
                .replace(/[*_]/g, "");
            const id = slugger.slug(text);
            toc.push({ id, text, level });
        }
    }

    return toc;
}


/**
 * Configurable maximum traversal degree for local citation mini-map.
 * User-configurable in source code (default: 2 degrees).
 */
export const MAX_GRAPH_DEPTH = 2;

/**
 * Extracts outbound wikilink mentions from a post's content.
 */
function getPostMentions(post: CompendiumPostMeta, allPosts: CompendiumPostMeta[]): Set<string> {
    const mentions = new Set<string>();
    const sourceText = post.rawContent || post.content;
    if (!sourceText) return mentions;
    const regex = /\[\[([^\]|#]*)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
    let match;
    while ((match = regex.exec(sourceText)) !== null) {
        const targetRaw = (match[1] || "").trim().toLowerCase();
        if (!targetRaw) continue;
        const targetSlug = slugify(targetRaw);
        const matched = allPosts.find(
            (p) =>
                p.title.toLowerCase() === targetRaw ||
                p.filename.replace(/\.md$/, "").toLowerCase() === targetRaw ||
                p.slug === targetSlug ||
                (p.aliases &&
                    p.aliases.some(
                        (a) => a.toLowerCase() === targetRaw || slugify(a) === targetSlug
                    ))
        );
        if (matched && matched.slug !== post.slug) {
            mentions.add(matched.slug);
        }
    }
    return mentions;
}

/**
 * Assembles a local citation & backlink concept graph using BFS up to maxDepth.
 * Decouples domain hubs from BFS expansion so graph stays high-signal.
 */
export function buildConceptGraph(
    currentPost: CompendiumPostMeta,
    allPosts: CompendiumPostMeta[],
    maxDepth: number = MAX_GRAPH_DEPTH
): PostGraph {
    const nodesMap = new Map<string, GraphNode>();
    const linksMap = new Map<string, GraphLink>();

    // Add active note
    nodesMap.set(currentPost.slug, {
        id: currentPost.slug,
        label: currentPost.title,
        type: "current",
        slug: currentPost.slug,
        url: `/compendium/${currentPost.slug}`,
    });

    // Add domain hubs for the active note
    for (const domain of currentPost.domains) {
        if (!nodesMap.has(domain.id)) {
            nodesMap.set(domain.id, {
                id: domain.id,
                label: domain.name,
                type: "domain",
                url: `/compendium?domain=${domain.slug}`,
            });
        }
        const linkKey = `${currentPost.slug}->${domain.id}:domain`;
        linksMap.set(linkKey, {
            source: currentPost.slug,
            target: domain.id,
            type: "domain",
        });
    }

    // Precompute mention adjacency list
    const forwardMentions = new Map<string, Set<string>>();
    for (const p of allPosts) {
        forwardMentions.set(p.slug, getPostMentions(p, allPosts));
    }

    // BFS Traversal strictly across citations & backlinks
    const visitedDepth = new Map<string, number>();
    visitedDepth.set(currentPost.slug, 0);

    const queue: Array<{ slug: string; depth: number }> = [{ slug: currentPost.slug, depth: 0 }];

    while (queue.length > 0) {
        const { slug, depth } = queue.shift()!;
        if (depth >= maxDepth) continue;

        const currentP = allPosts.find((p) => p.slug === slug);
        if (!currentP) continue;

        // 1. Forward citations (slug mentions neighbor)
        const forward = forwardMentions.get(slug) || new Set<string>();
        for (const targetSlug of Array.from(forward)) {
            const targetP = allPosts.find((p) => p.slug === targetSlug);
            if (!targetP) continue;

            if (!nodesMap.has(targetSlug)) {
                nodesMap.set(targetSlug, {
                    id: targetSlug,
                    label: targetP.title,
                    type: "post",
                    slug: targetSlug,
                    url: `/compendium/${targetSlug}`,
                });
            }

            const linkKey = `${slug}->${targetSlug}:mention`;
            if (!linksMap.has(linkKey)) {
                linksMap.set(linkKey, {
                    source: slug,
                    target: targetSlug,
                    type: "mention",
                });
            }

            const currentRecordedDepth = visitedDepth.get(targetSlug);
            if (currentRecordedDepth === undefined || depth + 1 < currentRecordedDepth) {
                visitedDepth.set(targetSlug, depth + 1);
                queue.push({ slug: targetSlug, depth: depth + 1 });
            }
        }

        // 2. Backlinks (neighbor mentions slug)
        for (const other of allPosts) {
            if (other.slug === slug) continue;
            const otherMentions = forwardMentions.get(other.slug);
            if (otherMentions && otherMentions.has(slug)) {
                if (!nodesMap.has(other.slug)) {
                    nodesMap.set(other.slug, {
                        id: other.slug,
                        label: other.title,
                        type: "post",
                        slug: other.slug,
                        url: `/compendium/${other.slug}`,
                    });
                }

                const linkKey = `${other.slug}->${slug}:mention`;
                if (!linksMap.has(linkKey)) {
                    linksMap.set(linkKey, {
                        source: other.slug,
                        target: slug,
                        type: "mention",
                    });
                }

                const currentRecordedDepth = visitedDepth.get(other.slug);
                if (currentRecordedDepth === undefined || depth + 1 < currentRecordedDepth) {
                    visitedDepth.set(other.slug, depth + 1);
                    queue.push({ slug: other.slug, depth: depth + 1 });
                }
            }
        }
    }

    return {
        nodes: Array.from(nodesMap.values()),
        links: Array.from(linksMap.values()),
    };
}

/**
 * Loads a single post by slug, compiling markdown via unified AST pipeline and assembling concept graph.
 */
export async function getPostBySlug(slug: string): Promise<CompendiumPost | null> {
    const allPosts = getAllPostsMeta();
    const meta = allPosts.find((p) => p.slug === slug);
    if (!meta) return null;

    const fullPath = path.join(COMPENDIUM_DIR, meta.filename);
    if (!fs.existsSync(fullPath)) return null;

    const fileContent = fs.readFileSync(fullPath, "utf-8");
    const { content: rawMarkdown } = matter(fileContent);

    // Track active mentions
    const mentionedSlugs = new Set<string>();
    const toc: TocItem[] = [];

    // Unified Remark & Rehype Pipeline
    const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkStripDocumentH1)
        .use(remarkWikilinks, allPosts, (targetSlug: string) => {
            if (targetSlug !== meta.slug) {
                mentionedSlugs.add(targetSlug);
            }
        })
        .use(remarkPruneReferences)
        .use(remarkCallouts)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeSlug)
        .use(rehypeExtractToc, toc)
        .use(rehypeKatex)
        .use(rehypeWrapKatex)
        .use(rehypeShiki, {
            theme: "github-dark-dimmed",
            transformers: [
                {
                    pre(node) {
                        node.properties["data-lang"] = this.options.lang || "plaintext";
                    },
                },
            ],
        })
        .use(rehypeWrapCodeBlocks)
        .use(rehypeStringify, { allowDangerousHtml: true });

    const htmlResult = await processor.process(rawMarkdown);
    const contentHtml = String(htmlResult);

    // Assemble Local Concept Graph using BFS citation/backlink traversal
    const graph = buildConceptGraph(meta, allPosts, MAX_GRAPH_DEPTH);

    return {
        ...meta,
        contentHtml,
        rawMarkdown,
        toc,
        graph,
    };
}
