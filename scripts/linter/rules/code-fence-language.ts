import { LintRule, LintContext, LintResult, LintIssue } from "../types";

/**
 * Rule: code-fence-language
 * Ensures every fenced code block specifies a language identifier for syntax highlighting.
 * In fix mode, unadorned code fences default to 'text'.
 */
export const codeFenceLanguageRule: LintRule = {
    id: "code-fence-language",
    name: "Code Fence Language",
    description: "Ensures code blocks specify a language identifier (e.g. ```bash, ```c, ```text).",
    run(context: LintContext): LintResult {
        const issues: LintIssue[] = [];
        const lines = context.content.split("\n");
        let insideCodeFence = false;
        let modified = false;
        let fixedCount = 0;

        const newLines = lines.map((line, index) => {
            const lineNum = index + 1;
            const match = line.match(/^(\s*)(```|~~~)(.*)$/);

            if (match) {
                if (!insideCodeFence) {
                    // Opening fence
                    insideCodeFence = true;
                    const indent = match[1];
                    const fence = match[2];
                    const language = match[3].trim();

                    if (!language) {
                        issues.push({
                            ruleId: "code-fence-language",
                            file: context.filename,
                            line: lineNum,
                            severity: "error",
                            message: "Fenced code block is missing a language identifier (e.g. ```bash, ```c, ```text).",
                        });

                        if (context.isFixMode) {
                            modified = true;
                            fixedCount++;
                            return `${indent}${fence}text`;
                        }
                    }
                } else {
                    // Closing fence
                    insideCodeFence = false;
                }
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
