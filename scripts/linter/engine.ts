import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getAllPostsMeta } from "../../lib/compendium";
import { LintContext, LintIssue, LintRule } from "./types";
import { DEFAULT_RULES } from "./rules";

const COMPENDIUM_DIR = path.join(process.cwd(), "content", "compendium");

export interface LinterOptions {
    files?: string[];
    fix?: boolean;
    rules?: LintRule[];
}

export function runLinter(options: LinterOptions = {}) {
    const isFixMode = options.fix ?? process.argv.includes("--fix");
    const rules = options.rules || DEFAULT_RULES;

    console.log("==================================================");
    console.log("   THE COMPENDIUM LINTER (scripts/linter)");
    console.log(`   Mode: ${isFixMode ? "Fix & Audit (--fix)" : "Audit Only"}`);
    console.log(`   Rules: ${rules.map((r) => r.id).join(", ")}`);
    console.log("==================================================\n");

    if (!fs.existsSync(COMPENDIUM_DIR)) {
        console.error(`Error: Directory not found: ${COMPENDIUM_DIR}`);
        process.exit(1);
    }

    // Determine target files
    let targetFiles: string[] = [];

    if (options.files && options.files.length > 0) {
        targetFiles = options.files;
    } else {
        const cliArgs = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
        if (cliArgs.length > 0) {
            targetFiles = cliArgs;
        } else {
            targetFiles = fs
                .readdirSync(COMPENDIUM_DIR)
                .filter((f) => f.endsWith(".md") && !f.startsWith("."))
                .map((f) => path.join("content", "compendium", f));
        }
    }

    if (targetFiles.length === 0) {
        console.log("No markdown files matched for linting.");
        return { totalFiles: 0, errors: [], warnings: [], totalFixes: 0 };
    }

    const allPosts = getAllPostsMeta();
    const allIssues: LintIssue[] = [];
    let totalFixes = 0;
    let filesAudited = 0;

    for (const rawPath of targetFiles) {
        const absPath = path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), rawPath);
        if (!fs.existsSync(absPath)) continue;

        filesAudited++;
        const filename = path.basename(absPath);
        const rawContent = fs.readFileSync(absPath, "utf-8");
        const parsed = matter(rawContent);

        let currentContent = parsed.content;
        let currentFrontmatter = { ...parsed.data };
        let fileWasModified = false;

        for (const rule of rules) {
            const context: LintContext = {
                filename,
                filePath: absPath,
                raw: rawContent,
                frontmatter: currentFrontmatter,
                content: currentContent,
                allPosts,
                isFixMode,
            };

            const result = rule.run(context);
            if (result.issues && result.issues.length > 0) {
                allIssues.push(...result.issues);
            }

            if (isFixMode) {
                if (result.fixedContent !== undefined && result.fixedContent !== currentContent) {
                    currentContent = result.fixedContent;
                    fileWasModified = true;
                }
                if (result.fixedFrontmatter !== undefined) {
                    currentFrontmatter = result.fixedFrontmatter;
                    fileWasModified = true;
                }
                if (result.fixedCount) {
                    totalFixes += result.fixedCount;
                }
            }
        }

        if (isFixMode && fileWasModified) {
            const updatedRaw = matter.stringify(currentContent, currentFrontmatter);
            fs.writeFileSync(absPath, updatedRaw, "utf-8");
            console.log(`[FIXED] Applied auto-fixes to ${filename}`);
        }
    }

    const errors = allIssues.filter((i) => i.severity === "error");
    const warnings = allIssues.filter((i) => i.severity === "warn");

    console.log(`Audited ${filesAudited} compendium file(s):`);

    if (allIssues.length === 0) {
        console.log("✓ All notes passed verification with zero errors or warnings!\n");
        return { totalFiles: filesAudited, errors: [], warnings: [], totalFixes };
    }

    // Print issues
    for (const issue of allIssues) {
        const prefix =
            issue.severity === "error"
                ? "✗ [ERROR]"
                : issue.severity === "warn"
                  ? "⚠ [WARN]"
                  : "ℹ [INFO]";
        const location = issue.line ? `:${issue.line}` : "";
        console.log(`${prefix} ${issue.file}${location} [${issue.ruleId}]: ${issue.message}`);
    }

    console.log(`\nSummary: ${errors.length} error(s), ${warnings.length} warning(s).`);
    if (totalFixes > 0) {
        console.log(`✓ Applied ${totalFixes} automatic correction(s).`);
    }

    if (errors.length > 0) {
        process.exit(1);
    }

    return { totalFiles: filesAudited, errors, warnings, totalFixes };
}
