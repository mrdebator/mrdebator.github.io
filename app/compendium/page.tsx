import { Suspense } from "react";
import SectionHeading from "@/components/section-heading";
import { getAllPostsMeta } from "@/lib/compendium";
import { COMPENDIUM_DOMAINS } from "@/lib/domains";
import CompendiumClientPage from "./CompendiumClientPage";
import { BookOpen } from "lucide-react";

export const metadata = {
    title: "Compendium",
    description: "A curation of rabbit holes, intellectual omnivory, and breaking things to see how they work.",
};

function CompendiumSkeleton() {
    return (
        <div className="space-y-10 animate-pulse">
            <div className="flex flex-wrap items-center gap-2 pt-2">
                <div className="h-8 w-28 rounded-full bg-slate-800/80" />
                <div className="h-8 w-36 rounded-full bg-slate-800/80" />
                <div className="h-8 w-32 rounded-full bg-slate-800/80" />
            </div>
            <div className="h-10 w-full rounded-xl bg-slate-800/50" />
            <div className="space-y-6">
                <div className="h-36 rounded-xl bg-slate-900/40 border border-slate-800/80" />
                <div className="h-36 rounded-xl bg-slate-900/40 border border-slate-800/80" />
            </div>
        </div>
    );
}

export default function CompendiumPage() {
    const posts = getAllPostsMeta()
        .filter((p) => !p.draft)
        .map(({ rawContent: _rawContent, ...post }) => post);

    const domainsWithCounts = COMPENDIUM_DOMAINS.map((domain) => {
        const count = posts.filter((p) => p.domains.some((d) => d.id === domain.id)).length;
        return { domain, count };
    }).filter((item) => item.count > 0);

    return (
        <main className="min-h-screen pt-6 md:pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex flex-col items-center text-center gap-4">
                    <BookOpen className="h-12 w-12 text-primary" />
                    <SectionHeading
                        title="Compendium"
                        subtitle="A curation of rabbit holes, intellectual omnivory, and breaking things to see how they work."
                    />
                </div>
                <Suspense fallback={<CompendiumSkeleton />}>
                    <CompendiumClientPage initialPosts={posts} domainsWithCounts={domainsWithCounts} />
                </Suspense>
            </div>
        </main>
    );
}
