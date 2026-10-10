"use client";

import { useEffect } from "react";

/**
 * Event-delegated clipboard copy handler for Compendium Shiki code blocks.
 */
export default function CompendiumCodeCopyHandler() {
    useEffect(() => {
        const handleClick = async (e: MouseEvent) => {
            const btn = (e.target as HTMLElement).closest(".copy-code-btn");
            if (!btn) return;

            const wrapper = btn.closest(".code-block-wrapper");
            const codeEl = wrapper?.querySelector("code");
            if (!codeEl) return;

            const codeText = codeEl.innerText || codeEl.textContent || "";
            let copied = false;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(codeText);
                    copied = true;
                } else {
                    throw new Error("Clipboard API unavailable");
                }
            } catch {
                try {
                    const textArea = document.createElement("textarea");
                    textArea.value = codeText;
                    textArea.style.position = "fixed";
                    textArea.style.opacity = "0";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    copied = document.execCommand("copy");
                    document.body.removeChild(textArea);
                } catch (fallbackErr) {
                    console.error("Failed to copy code to clipboard:", fallbackErr);
                }
            }

            if (copied) {
                const textSpan = btn.querySelector(".copy-text");
                if (textSpan) {
                    const orig = textSpan.textContent;
                    textSpan.textContent = "Copied!";
                    btn.classList.add("text-emerald-400");
                    setTimeout(() => {
                        textSpan.textContent = orig;
                        btn.classList.remove("text-emerald-400");
                    }, 2000);
                }
            }
        };

        document.addEventListener("click", handleClick);
        return () => {
            document.removeEventListener("click", handleClick);
        };
    }, []);

    return null;
}
