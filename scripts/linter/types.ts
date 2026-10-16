export type LintSeverity = "error" | "warn" | "info";

export interface LintIssue {
    ruleId: string;
    file: string;
    line?: number;
    column?: number;
    severity: LintSeverity;
    message: string;
}

export interface LintContext {
    filename: string;
    filePath: string;
    raw: string;
    frontmatter: Record<string, any>;
    content: string;
    allPosts: any[];
    isFixMode: boolean;
}

export interface LintResult {
    issues: LintIssue[];
    fixedContent?: string;
    fixedFrontmatter?: Record<string, any>;
    fixedCount?: number;
}

export interface LintRule {
    id: string;
    name: string;
    description: string;
    run: (context: LintContext) => LintResult;
}
