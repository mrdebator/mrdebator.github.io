import { LintRule, LintContext, LintResult, LintIssue } from "../types";

/**
 * Rule: heading-spacing
 * Ensures all Markdown headings (# through ######) are preceded by an empty line
 * (unless the heading is the first non-empty line of content).
 */
export const headingSpacingRule: LintRule = {
    id: "heading-spacing",
    name: "Heading Spacing",
    description: "Ensures headings are preceded by an empty line.",
    run(context: LintContext): LintResult {
        const issues: LintIssue[] = [];
        const lines = context.content.split("\n");
        let insideCodeFence = false;
        let modified = false;
        let fixedCount = 0;
        const newLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Toggle code fence
            if (/^\s*(```|~~~)/.test(line)) {
                insideCodeFence = !insideCodeFence;
                newLines.push(line);
                continue;
            }

            if (!insideCodeFence && /^#{1,6}\s+/.test(line)) {
                // Check if preceded by an empty line
                let isPrecededByEmpty = false;

                if (newLines.length === 0) {
                    // First line of content is allowed without preceding blank line
                    isPrecededByEmpty = true;
                } else {
                    const prevLine = newLines[newLines.length - 1];
                    if (prevLine.trim() === "") {
                        isPrecededByEmpty = true;
                    }
                }

                if (!isPrecededByEmpty) {
                    issues.push({
                        ruleId: "heading-spacing",
                        file: context.filename,
                        line: i + 1,
                        severity: "warn",
                        message: `Heading '${line.trim().slice(0, 40)}' must be preceded by an empty line.`,
                    });

                    if (context.isFixMode) {
                        newLines.push(""); // Insert empty line before heading
                        modified = true;
                        fixedCount++;
                    }
                }
            }

            newLines.push(line);
        }

        return {
            issues,
            fixedContent: modified && context.isFixMode ? newLines.join("\n") : undefined,
            fixedCount,
        };
    },
};
