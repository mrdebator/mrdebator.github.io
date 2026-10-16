import { LintRule, LintContext, LintResult, LintIssue } from "../types";
import { normalizeDomain } from "../../../lib/domains";

/**
 * Rule: frontmatter-taxonomy
 * Validates frontmatter completeness (title, created date) and enforces
 * that note domains strictly match the 14 curated domains in Domains.md.
 */
export const frontmatterTaxonomyRule: LintRule = {
    id: "frontmatter-taxonomy",
    name: "Frontmatter Taxonomy",
    description: "Validates frontmatter fields and domain membership against official taxonomy.",
    run(context: LintContext): LintResult {
        const issues: LintIssue[] = [];
        const { frontmatter, filename } = context;

        // 1. Title verification
        if (!frontmatter.title) {
            issues.push({
                ruleId: "frontmatter-taxonomy",
                file: filename,
                severity: "warn",
                message: "Missing 'title' in frontmatter; inferred from filename or first heading.",
            });
        }

        // 2. Created date verification
        if (!frontmatter.created && !frontmatter.date) {
            issues.push({
                ruleId: "frontmatter-taxonomy",
                file: filename,
                severity: "error",
                message: "Missing 'created' date in frontmatter.",
            });
        } else {
            const dateStr = frontmatter.created || frontmatter.date;
            const parsed = new Date(dateStr);
            if (isNaN(parsed.getTime())) {
                issues.push({
                    ruleId: "frontmatter-taxonomy",
                    file: filename,
                    severity: "error",
                    message: `Invalid date format: '${dateStr}'. Expected format like 'YYYY-MM-DD HH:mm'.`,
                });
            }
        }

        // 3. Domains verification
        const rawDomains: string[] = Array.isArray(frontmatter.domains)
            ? frontmatter.domains
            : typeof frontmatter.domains === "string"
              ? [frontmatter.domains]
              : [];

        if (rawDomains.length === 0) {
            issues.push({
                ruleId: "frontmatter-taxonomy",
                file: filename,
                severity: "warn",
                message: "No domains assigned. Add at least one domain from Domains.md to categorize this note.",
            });
        } else {
            for (const rawD of rawDomains) {
                const normalized = normalizeDomain(rawD);
                if (!normalized) {
                    issues.push({
                        ruleId: "frontmatter-taxonomy",
                        file: filename,
                        severity: "error",
                        message: `Unknown domain '${rawD}'. Must match one of the 14 domains in Domains.md.`,
                    });
                }
            }
        }

        return { issues };
    },
};
