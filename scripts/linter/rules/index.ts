import { LintRule } from "../types";
import { typographyDashesRule } from "./typography-dashes";
import { headingSpacingRule } from "./heading-spacing";
import { codeFenceLanguageRule } from "./code-fence-language";
import { frontmatterTaxonomyRule } from "./frontmatter-taxonomy";
import { wikilinksIntegrityRule } from "./wikilinks-integrity";
import { vaultPrivacyRule } from "./vault-privacy";

export const DEFAULT_RULES: LintRule[] = [
    vaultPrivacyRule,
    frontmatterTaxonomyRule,
    codeFenceLanguageRule,
    headingSpacingRule,
    typographyDashesRule,
    wikilinksIntegrityRule,
];

export {
    vaultPrivacyRule,
    frontmatterTaxonomyRule,
    codeFenceLanguageRule,
    headingSpacingRule,
    typographyDashesRule,
    wikilinksIntegrityRule,
};
