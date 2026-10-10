import assert from "assert";
import { getPostBySlug, getAllPostsMeta, slugify, extractToc, remarkWikilinks } from "../lib/compendium";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";

async function runPipelineTests() {
    console.log("==================================================");
    console.log("   COMPENDIUM AST PIPELINE & WIKILINK TEST SUITE  ");
    console.log("==================================================\n");

    const mockPosts = [
        {
            slug: "windows",
            title: "Windows",
            created: "2025-01-01",
            formattedDate: "January 1, 2025",
            domains: [],
            readingTimeMinutes: 2,
            excerpt: "Windows OS",
            aliases: ["WinOS"],
            draft: false,
            filename: "Windows.md",
        },
        {
            slug: "direct-memory-access",
            title: "Direct Memory Access",
            created: "2025-01-01",
            formattedDate: "January 1, 2025",
            domains: [],
            readingTimeMinutes: 2,
            excerpt: "DMA concept",
            aliases: ["DMA"],
            draft: false,
            filename: "Direct Memory Access.md",
        },
    ];

    const mentions = new Set<string>();
    const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkWikilinks, mockPosts as any, (slug: string) => mentions.add(slug))
        .use(remarkRehype)
        .use(rehypeKatex)
        .use(rehypeStringify);

    const testCases = [
        {
            name: "1. Unpublished with anchor (no alias)",
            input: "[[Unknown#Memory Integrity]]",
            expected: "<p>Unknown Memory Integrity</p>",
        },
        {
            name: "2. Unpublished with anchor + alias",
            input: "[[Unknown#Memory Integrity|HVCI]]",
            expected: "<p>Unknown Memory Integrity (HVCI)</p>",
        },
        {
            name: "3. Unpublished with alias (no anchor)",
            input: "[[Unknown|Win11]]",
            expected: "<p>Unknown</p>",
        },
        {
            name: "4. Unpublished without anchor or alias",
            input: "[[Unknown]]",
            expected: "<p>Unknown</p>",
        },
        {
            name: "5. Published with anchor (no alias)",
            input: "[[Windows#Memory Integrity]]",
            expected: '<p><a href="/compendium/windows#memory-integrity">Windows Memory Integrity</a></p>',
        },
        {
            name: "6. Published with anchor + alias",
            input: "[[Windows#Memory Integrity|HVCI]]",
            expected: '<p><a href="/compendium/windows#memory-integrity">Windows Memory Integrity (HVCI)</a></p>',
        },
        {
            name: "7. Published with alias (no anchor)",
            input: "[[Windows|Win11]]",
            expected: '<p><a href="/compendium/windows">Windows</a></p>',
        },
        {
            name: "8. Published without anchor or alias",
            input: "[[Windows]]",
            expected: '<p><a href="/compendium/windows">Windows</a></p>',
        },
        {
            name: "9. Internal section jump",
            input: "[[#Section]]",
            expected: '<p><a href="#section">Section</a></p>',
        },
        {
            name: "10. Frontmatter alias support",
            input: "[[DMA]]",
            expected: '<p><a href="/compendium/direct-memory-access">DMA</a></p>',
        },
    ];

    let passed = 0;
    for (const tc of testCases) {
        const file = await processor.process(tc.input);
        const output = String(file).trim();
        assert.strictEqual(output, tc.expected, `Failed on: ${tc.name}`);
        console.log(`✓ PASS: ${tc.name}`);
        passed++;
    }

    assert.ok(mentions.has("windows"), "Mentions must include 'windows'");
    assert.ok(mentions.has("direct-memory-access"), "Mentions must include 'direct-memory-access'");
    console.log(`✓ PASS: Mentions tracking captured [${Array.from(mentions).join(", ")}]`);

    // Verify Real Post Compilation via getPostBySlug
    console.log("\n--- Real Article Compilation Verification ---");
    const post = await getPostBySlug("anticheats-vs-emulators");
    assert.ok(post, "Post 'anticheats-vs-emulators' must exist and compile");

    // Verify TOC & Heading IDs
    assert.ok(post.toc.length > 0, "Post must have TOC items extracted");
    console.log(`✓ PASS: TOC items extracted (${post.toc.length} headings)`);
    for (const item of post.toc) {
        assert.ok(
            post.contentHtml.includes(`id="${item.id}"`),
            `Heading id="${item.id}" must match rendered HTML`
        );
    }
    console.log("✓ PASS: 100% ID synchronicity between TOC and rendered heading tags");

    // Verify Concept Graph
    assert.ok(post.graph, "Concept graph must be assembled");
    assert.ok(post.graph.nodes.some((n) => n.type === "current"), "Graph must have active root node");
    assert.ok(post.graph.nodes.some((n) => n.type === "domain"), "Graph must have domain metadata node");
    console.log(`✓ PASS: Citation graph assembled with ${post.graph.nodes.length} nodes, ${post.graph.links.length} links`);

    console.log("\n==================================================");
    console.log(`All ${passed + 3} Pipeline & Wikilink Checks Passed!`);
    console.log("==================================================\n");
}

runPipelineTests().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
});
