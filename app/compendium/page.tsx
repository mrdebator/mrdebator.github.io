import SectionHeading from "@/components/section-heading";
import { getAllPostsMeta } from "@/lib/compendium";
import { COMPENDIUM_DOMAINS } from "@/lib/domains";
import CompendiumClientPage from "./CompendiumClientPage";

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
        <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
            <SectionHeading
                title="Compendium"
                subtitle="A structured technical compendium documenting operating systems internals, security research, and engineering notes organized by domain."
            />
            <CompendiumClientPage initialPosts={posts} domainsWithCounts={domainsWithCounts} />
        </main>
    );
}
