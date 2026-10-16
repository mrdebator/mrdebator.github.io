import { LintRule, LintContext, LintResult, LintIssue } from "../types";

/**
 * Rule: typography-dashes
 * Replaces Unicode em dashes ('—') with standardized spaced hyphens (' - ')
 * in prose, while ignoring fenced code blocks and inline code spans.
 */
export const typographyDashesRule: LintRule = {
    id: "typography-dashes",
    name: "Typography Dashes",
    description: "Enforces spaced hyphens (' - ') instead of em dashes ('—') in prose.",
    run(context: LintContext): LintResult {
        const issues: LintIssue[] = [];
        const lines = context.content.split("\n");
        let insideCodeFence = false;
        let modified = false;
        let fixedCount = 0;

        const newLines = lines.map((line, index) => {
            const lineNum = index + 1;
            // Check code fence toggle
            if (/^\s*(```|~~~)/.test(line)) {
                insideCodeFence = !insideCodeFence;
                return line;
            }

            if (insideCodeFence || !line.includes("—")) {
                return line;
            }

            // Split line by inline code spans: `...`
            const segments = line.split(/(`[^`]+`)/g);
            let lineHasChange = false;

            const processedSegments = segments.map((seg) => {
                if (seg.startsWith("`") && seg.endsWith("`") && seg.length >= 2) {
                    return seg; // Preserve inline code
                }

                if (seg.includes("—")) {
                    const occurrences = (seg.match(/—/g) || []).length;
                    for (let i = 0; i < occurrences; i++) {
                        issues.push({
                            ruleId: "typography-dashes",
                            file: context.filename,
                            line: lineNum,
                            severity: "warn",
                            message: "Em dash ('—') found in prose; should be normalized to spaced hyphen (' - ').",
                        });
                    }

                    lineHasChange = true;
                    fixedCount += occurrences;

                    // Normalize 'word—word', 'word — word', 'word —word', 'word— word' -> 'word - word'
                    return seg.replace(/(\S)?[ \t]*—[ \t]*(\S)?/g, (_match, left, right) => {
                        const leftPart = left !== undefined ? `${left} ` : "";
                        const rightPart = right !== undefined ? ` ${right}` : "";
                        return `${leftPart}-${rightPart}`;
                    });
                }
                return seg;
            });

            if (lineHasChange) {
                modified = true;
                return processedSegments.join("");
            }

            return line;
        });

        return {
            issues,
            fixedContent: modified && context.isFixMode ? newLines.join("\n") : undefined,
            fixedCount,
        };
    },
};
