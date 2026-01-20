import SectionHeading from "@/components/section-heading"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Award, Gavel, GraduationCap, Trophy, Users, Star, Mic } from "lucide-react"
import NextImage from "next/image"

export const metadata = {
    title: "Awards & Involvements",
    description: "My awards, leadership roles, and contributions to the community.",
}

const involvementsData = [
    // --- Category: Community Leadership & Judging ---
    {
        category: "Community Leadership & Judging",
        title: "Co-organizer & Judge, BSides SF CTF",
        organization: "BSides San Francisco",
        date: "2024 - Present",
        description: [
            "Co-organized and judged a large-scale Capture-the-Flag (CTF) competition for 1,350+ participants competing in 832 teams.",
            "Crafted unique challenges spanning a wide range of modern cybersecurity domains including Web Exploitation, Reversing, Forensics, and AI/ML.",
            "Hosted novel on-site engagement activities, including physical lock picking challenges and interactive QR code scavenger hunts.",
        ],
        imageUrl: "/involvements/bsides.jpg",
    },
    {
        category: "Community Leadership & Judging",
        title: "Judge, Startup in a Weekend",
        organization: "The Foundry",
        date: "Nov 2025",
        description: [
            "Evaluated technical demonstrations and implementations for 40+ teams during a high-stakes, 36-hour buildathon with over 120 participants.",
            "Analyzed software prototypes for technical complexity, soundness, and scalability alongside senior practitioners from Google, Microsoft, and Meta.",
            "Provided qualitative feedback and scoring on the implementation quality and original technical contributions of emerging software products.",
        ],
        imageUrl: "/involvements/foundry.jpg",
    },
    {
        category: "Community Leadership & Judging",
        title: "President, Drexel Cyberdragons",
        organization: "Drexel University Cybersecurity Club",
        date: "2022 - 2023",
        description: [
            "Led and scaled Drexel's student cybersecurity organization to over 500 members, focusing on three core pillars: education, hands-on learning, and industry networking.",
            "Directed an annual calendar of 60+ events, including technical workshops, competitive CTF training, and guest lectures from industry professionals to build practical, real-world skills.",
            "Constructed a cybersecurity lab using Proxmox, Kali Linux, and vulnerable machines on recycled servers to provide a safe environment for learning and experimentation.",
            "Managed executive operations, including budgeting and scheduling, while leading the club's competitive team to a regional championship victory.",
        ],
        imageUrl: "/involvements/cptc.jpg",
    },
    // --- Category: Research & Speaking Engagements ---
    {
        category: "Research & Speaking Engagements",
        title: "Presented on eBPF & AI-Powered EDRs",
        organization: "Red Team Summit 2025",
        date: "2025",
        imageUrl: "/involvements/rts.png",
        link: "/involvements/eBPF-AI-Powered-EDRs.pdf",
    },
    {
        category: "Research & Speaking Engagements",
        title: "Best Poster Presentation",
        organization: "Stanford Research Conference 2021",
        date: "2021",
        imageUrl: "/involvements/src.png",
        link: "/involvements/src_best_poster.pdf",
    },
    {
        category: "Research & Speaking Engagements",
        title: "Presented Research on Ontology Modeling",
        organization: "Harvard National Collegiate Research Conference 2020",
        date: "2020",
        imageUrl: "/involvements/harvard.webp",
        link: "https://mrdebator.notion.site/Securing-Industrial-Control-Systems-using-Ontologies-f7bd83a2fcd44a5d8c1103025366d3e5",
    },
    // --- Category: Competitive & Academic Honors ---
    {
        category: "Competitive & Academic Honors",
        title: "Summa Cum Laude",
        organization: "Drexel University, 2023",
        icon: GraduationCap,
        link: "/involvements/CeD-degree.pdf",
    },
    {
        category: "Competitive & Academic Honors",
        title: "Best Cybersecurity Senior Design Project",
        organization: "Drexel University, 2023",
        icon: Award,
        link: "/involvements/graphit-poster.pdf",
    },
    {
        category: "Competitive & Academic Honors",
        title: "A* Award",
        organization: "Drexel CS Department, 2023",
        icon: Star,
        link: "/involvements/cs-award.pdf",
    },
    {
        category: "Competitive & Academic Honors",
        title: "Distinguished Service Award for Outstanding Leadership",
        organization: "Drexel IS Department, 2023",
        icon: Star,
        link: "/involvements/is-award.pdf",
    },
    {
        category: "Competitive & Academic Honors",
        title: "Regional Winners",
        organization: "Collegiate Penetration Testing Competition 2021",
        icon: Trophy,
        link: "#",
    },
    {
        category: "Competitive & Academic Honors",
        title: "4th Place (out of 113 teams)",
        organization: "CyberSEED CTF 2021",
        icon: Trophy,
        link: "#",
    },
];

const categories = [
    { name: "Community Leadership & Judging", icon: Gavel },
    { name: "Research & Speaking Engagements", icon: Mic },
    { name: "Competitive & Academic Honors", icon: Trophy },
];

export default function InvolvementsPage() {
    return (
        <main className="min-h-screen pt-6 md:pt-24 pb-16">
            <div className="container mx-auto px-4">
                <div className="flex flex-col items-center text-center gap-4">
                    <Award className="h-12 w-12 text-primary" />
                    <SectionHeading
                        title="Awards & Involvements"
                        subtitle="A showcase of my accolades, leadership roles, and contributions to the community."
                    />
                </div>

                <div className="max-w-6xl mx-auto space-y-12">
                    {categories.map((category) => (
                        <section key={category.name}>
                            <div className="flex items-center gap-3 mb-8">
                                <category.icon className="h-8 w-8 text-primary" />
                                <h2 className="text-3xl font-bold">{category.name}</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {involvementsData
                                    .filter((item) => item.category === category.name)
                                    .map((item) => {
                                        if (category.name === "Community Leadership & Judging") {
                                            return (
                                                <Card key={item.title} id={item.title.includes("President") ? "president" : undefined} className="md:col-span-2 lg:col-span-3 bg-card/50 backdrop-blur-sm flex flex-col md:flex-row items-center md:items-start gap-6 p-6 scroll-mt-36">
                                                    <div className="relative w-full md:w-1/3 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                                                        <NextImage src={item.imageUrl!} alt={`Logo for ${item.title}`} fill className="object-cover" />
                                                    </div>
                                                    <div className="flex-grow text-center md:text-left">
                                                        <CardTitle className="text-xl">{item.title}</CardTitle>
                                                        <CardDescription className="text-lg">{item.organization}, {item.date}</CardDescription>
                                                        <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground text-lg text-left">
                                                            {item.description?.map((desc, i) => <li key={i}>{desc}</li>)}
                                                        </ul>
                                                    </div>
                                                </Card>
                                            );
                                        }
                                        if (category.name === "Research & Speaking Engagements") {
                                            return (
                                                <a key={item.title} href={item.link || "#"} target="_blank" rel="noopener noreferrer">
                                                    <Card className="bg-card/50 backdrop-blur-sm overflow-hidden h-full group transition-all hover:shadow-xl hover:-translate-y-1">
                                                        <div className="relative aspect-video overflow-hidden">
                                                            <NextImage src={item.imageUrl!} alt={`Thumbnail for ${item.title}`} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                                                        </div>
                                                        <CardHeader>
                                                            <CardTitle className="text-xl">{item.title}</CardTitle>
                                                            <p className="text-lg text-foreground">{item.organization}</p>
                                                        </CardHeader>
                                                    </Card>
                                                </a>
                                            );
                                        }
                                        if (category.name === "Competitive & Academic Honors") {
                                            if (!item.icon) return null;
                                            const Icon = item.icon;
                                            return (
                                                <a key={item.title} href={item.link || "#"} target="_blank" rel="noopener noreferrer">
                                                    <Card className="bg-card/50 backdrop-blur-sm h-full group transition-all hover:shadow-xl hover:-translate-y-1">
                                                        <CardHeader className="flex flex-row items-center gap-4">
                                                            <Icon className="h-8 w-8 text-amber-400 flex-shrink-0" />
                                                            <div>
                                                                <CardTitle className="text-xl">{item.title}</CardTitle>
                                                                <CardDescription className="text-lg">{item.organization}</CardDescription>
                                                            </div>
                                                        </CardHeader>
                                                    </Card>
                                                </a>
                                            );
                                        }
                                        return null;
                                    })}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </main>
    );
}
