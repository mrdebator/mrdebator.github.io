import { LintRule, LintContext, LintResult, LintIssue } from "../types";

/**
 * Rule: vault-privacy
 * Strips private Obsidian vault taxonomy ('type', 'tags') from frontmatter
 * to prevent leaking internal Zettelkasten metadata into the public repository.
 */
export const vaultPrivacyRule: LintRule = {
    id: "vault-privacy",
    name: "Vault Privacy",
    description: "Strips internal Obsidian vault properties ('type', 'tags') from public frontmatter.",
    run(context: LintContext): LintResult {
        const issues: LintIssue[] = [];
        const { frontmatter, filename } = context;
        let modified = false;
        let fixedCount = 0;
        const newFrontmatter = { ...frontmatter };

        if ("type" in newFrontmatter) {
            issues.push({
                ruleId: "vault-privacy",
                file: filename,
                severity: "warn",
                message: "Internal Obsidian vault property 'type' found in frontmatter.",
            });
            if (context.isFixMode) {
                delete newFrontmatter.type;
                modified = true;
                fixedCount++;
            }
        }

        if ("tags" in newFrontmatter) {
            issues.push({
                ruleId: "vault-privacy",
                file: filename,
                severity: "warn",
                message: "Internal Obsidian vault property 'tags' found in frontmatter.",
            });
            if (context.isFixMode) {
                delete newFrontmatter.tags;
                modified = true;
                fixedCount++;
            }
        }

        return {
            issues,
            fixedFrontmatter: modified && context.isFixMode ? newFrontmatter : undefined,
            fixedCount,
        };
    },
};
