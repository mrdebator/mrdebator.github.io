import React from 'react';
import Link from 'next/link';

// This component takes a string as a prop
export default function TextWithLinks({ text }: { text: string }) {
    // A regular expression to find all instances of [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    // Loop through all matches of the regex in the text
    while ((match = linkRegex.exec(text)) !== null) {
        const [fullMatch, linkText, url] = match;
        const matchIndex = match.index;

        // Add the plain text that came before the link
        if (matchIndex > lastIndex) {
            parts.push(text.substring(lastIndex, matchIndex));
        }

        // Add the Link component for the matched link
        parts.push(
            <Link key={matchIndex} href={url} className="text-[#00ff00] hover:underline">
                {linkText}
            </Link>
        );

        lastIndex = matchIndex + fullMatch.length;
    }

    // Add any remaining plain text after the last link
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return <>{parts}</>;
}
