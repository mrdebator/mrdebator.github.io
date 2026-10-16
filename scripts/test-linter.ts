import assert from "assert";
import { typographyDashesRule } from "./linter/rules/typography-dashes";
import { headingSpacingRule } from "./linter/rules/heading-spacing";
import { codeFenceLanguageRule } from "./linter/rules/code-fence-language";
import { frontmatterTaxonomyRule } from "./linter/rules/frontmatter-taxonomy";
import { vaultPrivacyRule } from "./linter/rules/vault-privacy";
import { LintContext } from "./linter/types";

function createMockContext(content: string, frontmatter: Record<string, any> = {}, isFixMode = false): LintContext {
    return {
        filename: "test.md",
        filePath: "/mock/test.md",
        raw: "",
        frontmatter,
        content,
        allPosts: [],
        isFixMode,
    };
}

console.log("==================================================");
console.log("       COMPENDIUM LINTER UNIT TEST SUITE          ");
console.log("==================================================\n");

// --- 1. Typography Dashes Rule ---
console.log("--- Testing typography-dashes rule ---");

// Test 1a: Replace em dashes in prose
const textWithEmDash = "Critical processes—including LSASS—inside a bubble.";
const ctxDashesAudit = createMockContext(textWithEmDash, {}, false);
const resDashesAudit = typographyDashesRule.run(ctxDashesAudit);
assert.strictEqual(resDashesAudit.issues.length, 2, "Should detect 2 em dashes");

const ctxDashesFix = createMockContext(textWithEmDash, {}, true);
const resDashesFix = typographyDashesRule.run(ctxDashesFix);
assert.strictEqual(
    resDashesFix.fixedContent,
    "Critical processes - including LSASS - inside a bubble.",
    "Should normalize em dashes to spaced hyphens"
);
console.log("✓ PASS: Normalizes prose em dashes to ' - '");

// Test 1b: Preserve em dashes inside fenced code blocks
const textWithCodeFence = "Here is code:\n```bash\necho 'a—b'\n```\nAnd prose—here.";
const ctxDashesFence = createMockContext(textWithCodeFence, {}, true);
const resDashesFence = typographyDashesRule.run(ctxDashesFence);
assert.strictEqual(
    resDashesFence.fixedContent,
    "Here is code:\n```bash\necho 'a—b'\n```\nAnd prose - here.",
    "Should not alter em dashes inside code fences"
);
console.log("✓ PASS: Preserves em dashes inside fenced code blocks");

// Test 1c: Preserve em dashes inside inline code
const textWithInline = "Check `code—span` and prose—span.";
const ctxDashesInline = createMockContext(textWithInline, {}, true);
const resDashesInline = typographyDashesRule.run(ctxDashesInline);
assert.strictEqual(
    resDashesInline.fixedContent,
    "Check `code—span` and prose - span.",
    "Should not alter em dashes inside inline code backticks"
);
console.log("✓ PASS: Preserves em dashes inside inline code spans");

// --- 2. Heading Spacing Rule ---
console.log("\n--- Testing heading-spacing rule ---");

// Test 2a: Missing blank line before heading
const textHeadingNoSpace = "Paragraph before heading.\n## Section Heading\nContent after.";
const ctxHeadingAudit = createMockContext(textHeadingNoSpace, {}, false);
const resHeadingAudit = headingSpacingRule.run(ctxHeadingAudit);
assert.strictEqual(resHeadingAudit.issues.length, 1, "Should flag missing blank line before heading");

const ctxHeadingFix = createMockContext(textHeadingNoSpace, {}, true);
const resHeadingFix = headingSpacingRule.run(ctxHeadingFix);
assert.strictEqual(
    resHeadingFix.fixedContent,
    "Paragraph before heading.\n\n## Section Heading\nContent after.",
    "Should insert blank line before heading in fix mode"
);
console.log("✓ PASS: Enforces and auto-inserts blank line before headings");

// Test 2b: Heading with proper blank line passes
const textHeadingProper = "Paragraph.\n\n## Proper Heading\nContent.";
const resHeadingProper = headingSpacingRule.run(createMockContext(textHeadingProper, {}, false));
assert.strictEqual(resHeadingProper.issues.length, 0, "Proper heading spacing should pass cleanly");
console.log("✓ PASS: Heading with preceding blank line passes cleanly");

// Test 2c: Heading inside code fence is ignored
const textHeadingInFence = "Paragraph.\n```markdown\n# Not A Real Heading\n```";
const resHeadingFence = headingSpacingRule.run(createMockContext(textHeadingInFence, {}, false));
assert.strictEqual(resHeadingFence.issues.length, 0, "Should ignore '#' inside code fences");
console.log("✓ PASS: Ignores '#' characters inside code fences");

// --- 3. Code Fence Language Rule ---
console.log("\n--- Testing code-fence-language rule ---");

// Test 3a: Code fence without language identifier flags error
const textNoLang = "```\necho 'hello'\n```";
const resNoLangAudit = codeFenceLanguageRule.run(createMockContext(textNoLang, {}, false));
assert.strictEqual(resNoLangAudit.issues.length, 1, "Should flag missing language");
assert.strictEqual(resNoLangAudit.issues[0].severity, "error", "Missing language should be an error");

const resNoLangFix = codeFenceLanguageRule.run(createMockContext(textNoLang, {}, true));
assert.strictEqual(
    resNoLangFix.fixedContent,
    "```text\necho 'hello'\n```",
    "Should auto-fix empty code fence to ```text"
);
console.log("✓ PASS: Flags missing code fence language and defaults to 'text' in fix mode");

// Test 3b: Code fence with language identifier passes cleanly
const textWithLang = "```typescript\nconst x = 1;\n```";
const resWithLang = codeFenceLanguageRule.run(createMockContext(textWithLang, {}, false));
assert.strictEqual(resWithLang.issues.length, 0, "Code fence with language should pass cleanly");
console.log("✓ PASS: Code fence with specified language passes cleanly");

// --- 4. Frontmatter Taxonomy Rule ---
console.log("\n--- Testing frontmatter-taxonomy rule ---");

// Test 4a: Unknown domain flags error
const ctxBadDomain = createMockContext("", {
    title: "Test",
    created: "2025-01-01 12:00",
    domains: ["[[Fake Domain That Does Not Exist]]"],
});
const resBadDomain = frontmatterTaxonomyRule.run(ctxBadDomain);
assert.strictEqual(resBadDomain.issues.filter((i) => i.severity === "error").length, 1);
console.log("✓ PASS: Flags unknown domain as an error");

// Test 4b: Valid domain passes
const ctxGoodDomain = createMockContext("", {
    title: "Test",
    created: "2025-01-01 12:00",
    domains: ["[[Operating Systems Internals]]"],
});
const resGoodDomain = frontmatterTaxonomyRule.run(ctxGoodDomain);
assert.strictEqual(resGoodDomain.issues.length, 0);
console.log("✓ PASS: Curated domain passes cleanly");

// --- 5. Vault Privacy Rule ---
console.log("\n--- Testing vault-privacy rule ---");

// Test 5a: Strips 'type' and 'tags' in fix mode
const ctxVault = createMockContext("", {
    title: "Test",
    type: "permanent-note",
    tags: ["distilled", "security"],
}, true);
const resVault = vaultPrivacyRule.run(ctxVault);
assert.strictEqual(resVault.fixedFrontmatter?.type, undefined, "Should delete 'type'");
assert.strictEqual(resVault.fixedFrontmatter?.tags, undefined, "Should delete 'tags'");
assert.strictEqual(resVault.fixedFrontmatter?.title, "Test", "Should retain non-private properties");
console.log("✓ PASS: Strips internal Obsidian vault taxonomy ('type', 'tags')");

console.log("\n==================================================");
console.log("   ALL COMPENDIUM LINTER UNIT TESTS PASSED!       ");
console.log("==================================================");
