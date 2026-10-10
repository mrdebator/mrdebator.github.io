import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { execSync } from "child_process";

/**
 * Sanitizes Obsidian vault privacy metadata from Compendium markdown notes.
 * Strips 'type' and 'tags' YAML frontmatter keys so internal vault taxonomy
 * is never exposed in the public Git repository.
 */
function runSanitizer() {
    let filesToProcess: string[] = process.argv.slice(2).filter((f) => !f.startsWith("--"));

    if (filesToProcess.length === 0) {
        try {
            const staged = execSync("git diff --cached --name-only --diff-filter=ACM", { encoding: "utf-8" });
            filesToProcess = staged
                .split("\n")
                .map((f) => f.trim())
                .filter((f) => f.startsWith("content/compendium/") && f.endsWith(".md"));
        } catch {
            filesToProcess = [];
        }
    }

    if (process.argv.includes("--all")) {
        const compDir = path.join(process.cwd(), "content", "compendium");
        if (fs.existsSync(compDir)) {
            filesToProcess = fs
                .readdirSync(compDir)
                .filter((f) => f.endsWith(".md") && !f.startsWith("."))
                .map((f) => path.join("content", "compendium", f));
        }
    }

    let sanitizedCount = 0;

    for (const relPath of filesToProcess) {
        const absPath = path.isAbsolute(relPath) ? relPath : path.join(process.cwd(), relPath);
        if (!fs.existsSync(absPath)) continue;

        const raw = fs.readFileSync(absPath, "utf-8");
        const parsed = matter(raw);
        let changed = false;

        // Strip private Obsidian vault taxonomy
        if ("type" in parsed.data) {
            delete parsed.data.type;
            changed = true;
        }
        if ("tags" in parsed.data) {
            delete parsed.data.tags;
            changed = true;
        }

        if (changed) {
            const updated = matter.stringify(parsed.content, parsed.data);
            fs.writeFileSync(absPath, updated, "utf-8");
            sanitizedCount++;
            console.log(`[VAULT PRIVACY] Removed 'type' and 'tags' parameters from: ${relPath}`);

            try {
                execSync(`git add "${relPath}"`);
            } catch {
                // Ignore if not in git context
            }
        }
    }

    if (sanitizedCount > 0) {
        console.log(`✓ Sanitized ${sanitizedCount} compendium file(s) for public commit.`);
    }
}

runSanitizer();
