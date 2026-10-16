import { LintRule, LintContext, LintResult, LintIssue } from "../types";
import { extractToc, slugify, slugifyAnchor } from "../../../lib/compendium";

/**
 * Rule: wikilinks-integrity
 * Audits wikilinks syntax and verifies that internal section anchors match real headings.
 */
export const wikilinksIntegrityRule: LintRule = {
    id: "wikilinks-integrity",
    name: "Wikilinks Integrity",
    description: "Audits wikilink syntax and verifies internal heading anchors.",
    run(context: LintContext): LintResult {
        const issues: LintIssue[] = [];
        const { content, filename, frontmatter, allPosts } = context;

        const wikilinkRegex = /\[\[([^\]|#]*)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]([a-zA-Z]*)/g;
        let match;
        const headings = extractToc(content);
        const headingIds = new Set(headings.map((h) => h.id));

        while ((match = wikilinkRegex.exec(content)) !== null) {
            const target = (match[1] || "").trim();
            const anchor = match[2] ? match[2].trim() : null;
            const targetLower = target.toLowerCase();

            // Internal jump: [[#Section]]
            if (!target && anchor) {
                const expectedId = slugifyAnchor(anchor);
                if (!headingIds.has(expectedId)) {
                    issues.push({
                        ruleId: "wikilinks-integrity",
                        file: filename,
                        severity: "warn",
                        message: `Internal heading anchor '#${anchor}' does not match any heading in this post.`,
                    });
                }
                continue;
            }

            const isSelf =
                targetLower === (frontmatter.title || "").toLowerCase() ||
                targetLower === filename.replace(/\.md$/, "").toLowerCase();

            const matchedPost = allPosts.find(
                (p) =>
                    p.title.toLowerCase() === targetLower ||
                    p.filename.replace(/\.md$/, "").toLowerCase() === targetLower ||
                    p.slug === slugify(target) ||
                    (p.aliases &&
                        p.aliases.some(
                            (a: string) => a.toLowerCase() === targetLower || slugify(a) === slugify(target)
                        ))
            );

            if (matchedPost) {
                if (isSelf && anchor) {
                    const expectedId = slugifyAnchor(anchor);
                    if (!headingIds.has(expectedId)) {
                        issues.push({
                            ruleId: "wikilinks-integrity",
                            file: filename,
                            severity: "warn",
                            message: `Internal heading anchor '#${anchor}' does not match any heading in this post.`,
                        });
                    }
                }
            }
        }

        return { issues };
    },
};
