import SectionHeading from "@/components/section-heading";
import { getAllPostsMeta } from "@/lib/compendium";
import { COMPENDIUM_DOMAINS } from "@/lib/domains";
import CompendiumClientPage from "./CompendiumClientPage";
import { BookOpen } from "lucide-react";

export const metadata = {
    title: "Compendium",
    description: "A structured compendium of systems research, kernel internals, and technical architecture notes.",
};

export default function CompendiumPage() {
    const posts = getAllPostsMeta().filter((p) => !p.draft);

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
                        subtitle="A structured technical compendium documenting operating systems internals, security research, and engineering notes organized by domain."
                    />
                </div>
                <CompendiumClientPage initialPosts={posts} domainsWithCounts={domainsWithCounts} />
            </div>
        </main>
    );
}
