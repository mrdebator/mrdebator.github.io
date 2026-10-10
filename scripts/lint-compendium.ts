import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { COMPENDIUM_DOMAINS, normalizeDomain } from "../lib/domains";
import { extractToc, getAllPostsMeta, slugify } from "../lib/compendium";

const COMPENDIUM_DIR = path.join(process.cwd(), "content", "compendium");
const isFixMode = process.argv.includes("--fix");

interface LintIssue {
    file: string;
    level: "error" | "warn" | "info";
    message: string;
}

function runLinter() {
    console.log("==================================================");
    console.log("   THE COMPENDIUM LINTER (scripts/lint-compendium)");
    console.log(`   Mode: ${isFixMode ? "Fix & Audit (--fix)" : "Audit Only"}`);
    console.log("==================================================\n");

    if (!fs.existsSync(COMPENDIUM_DIR)) {
        console.error(`Error: Directory not found: ${COMPENDIUM_DIR}`);
        process.exit(1);
    }

    const files = fs
        .readdirSync(COMPENDIUM_DIR)
        .filter((f) => f.endsWith(".md") && !f.startsWith("."));

    if (files.length === 0) {
        console.log("No markdown notes found in content/compendium/.");
        return;
    }

    const allPosts = getAllPostsMeta();
    const issues: LintIssue[] = [];
    let totalWikilinks = 0;
    let resolvedLinks = 0;
    let strippedVaultLinks = 0;

    for (const filename of files) {
        const fullPath = path.join(COMPENDIUM_DIR, filename);
        const rawContent = fs.readFileSync(fullPath, "utf-8");
        const { data, content } = matter(rawContent);
        let modified = false;
        const fileData = { ...data };

        // 1. Title verification
        if (!data.title) {
            issues.push({
                file: filename,
                level: "warn",
                message: "Missing 'title' in frontmatter; inferred from filename or first heading.",
            });
        }

        // 2. Created date verification
        if (!data.created && !data.date) {
            issues.push({
                file: filename,
                level: "error",
                message: "Missing 'created' date in frontmatter.",
            });
        } else {
            const d = new Date(data.created || data.date);
            if (isNaN(d.getTime())) {
                issues.push({
                    file: filename,
                    level: "error",
                    message: `Invalid date format: '${data.created || data.date}'`,
                });
            }
        }

        // 3. Domain verification against official taxonomy
        const rawDomains: string[] = Array.isArray(data.domains)
            ? data.domains
            : typeof data.domains === "string"
              ? [data.domains]
              : [];

        if (rawDomains.length === 0) {
            issues.push({
                file: filename,
                level: "warn",
                message: "No domains assigned. Add at least one domain from Domains.md to categorize this note.",
            });
        } else {
            for (const rawD of rawDomains) {
                const normalized = normalizeDomain(rawD);
                if (!normalized) {
                    issues.push({
                        file: filename,
                        level: "error",
                        message: `Unknown domain '${rawD}'. Must match one of the 14 domains in Domains.md.`,
                    });
                }
            }
        }

        // 4. Wikilink resolution audit
        const wikilinkRegex = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]([a-zA-Z]*)/g;
        let match;
        const headings = extractToc(content);
        const headingIds = new Set(headings.map((h) => h.id));

        while ((match = wikilinkRegex.exec(content)) !== null) {
            totalWikilinks++;
            const target = match[1].trim();
            const anchor = match[2] ? match[2].trim() : null;
            const targetLower = target.toLowerCase();

            const isSelf =
                targetLower === (data.title || "").toLowerCase() ||
                targetLower === filename.replace(/\.md$/, "").toLowerCase();

            const matchedPost = allPosts.find(
                (p) =>
                    p.title.toLowerCase() === targetLower ||
                    p.filename.replace(/\.md$/, "").toLowerCase() === targetLower ||
                    p.slug === slugify(target)
            );

            if (matchedPost) {
                resolvedLinks++;
                // If it references an anchor in the same or published post, check if the anchor exists
                if (isSelf && anchor) {
                    const expectedId = slugify(anchor);
                    if (!headingIds.has(expectedId)) {
                        issues.push({
                            file: filename,
                            level: "warn",
                            message: `Internal heading anchor '#${anchor}' does not match any heading in this post.`,
                        });
                    }
                }
            } else {
                strippedVaultLinks++;
            }
        }

        // 5. Fix mode: Clean obsolete Obsidian Zettelkasten tags
        if (isFixMode) {
            let changed = false;
            if ("type" in fileData && fileData.type === "distilled") {
                delete fileData.type;
                changed = true;
            }
            if ("tags" in fileData && Array.isArray(fileData.tags)) {
                const cleanedTags = fileData.tags.filter(
                    (t: string) => !t.startsWith("Zettel/")
                );
                if (cleanedTags.length === 0) {
                    delete fileData.tags;
                } else {
                    fileData.tags = cleanedTags;
                }
                changed = true;
            }

            if (changed) {
                const newContent = matter.stringify(content, fileData);
                fs.writeFileSync(fullPath, newContent, "utf-8");
                console.log(`[FIXED] Cleaned frontmatter in ${filename}`);
            }
        }
    }

    // Print Report
    console.log(`Audited ${files.length} compendium file(s):`);
    console.log(`- Total wikilinks found: ${totalWikilinks}`);
    console.log(`- Active cross-post hyperlinks: ${resolvedLinks}`);
    console.log(`- Cleanly stripped private vault mentions: ${strippedVaultLinks}\n`);

    const errors = issues.filter((i) => i.level === "error");
    const warnings = issues.filter((i) => i.level === "warn");

    if (issues.length === 0) {
        console.log("✓ All notes passed verification with zero errors or warnings!");
        return;
    }

    for (const issue of issues) {
        const prefix =
            issue.level === "error"
                ? "✗ [ERROR]"
                : issue.level === "warn"
                  ? "⚠ [WARN]"
                  : "ℹ [INFO]";
        console.log(`${prefix} ${issue.file}: ${issue.message}`);
    }

    console.log(`\nSummary: ${errors.length} error(s), ${warnings.length} warning(s).`);

    if (errors.length > 0) {
        process.exit(1);
    }
}

runLinter();
