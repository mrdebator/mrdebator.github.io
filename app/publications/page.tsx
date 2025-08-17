import React from "react"
import SectionHeading from "@/components/section-heading"
import { Button } from "@/components/ui/button"
import { Feather, ExternalLink } from "lucide-react"
import Link from "next/link"
import NextImage from "next/image"

export const metadata = {
    title: "Publications",
    description: "My research papers, articles, and published works",
}

// Data for featured contributions
const featuredContributions = {
    title: "A Framework for Evaluating Emerging Cyberattack Capabilities of AI",
    venue: "Google DeepMind",
    date: "2025",
    contribution: "Acknowledged by the authors for foundational contributions, including the primary research and data collection used to develop the framework for evaluating AI's emerging cyberattack capabilities.",
    description: "This seminal work from Google DeepMind introduces a novel framework for systematically evaluating the emerging cyberattack capabilities of advanced AI models. Addressing the limitations of ad-hoc testing, the framework models the end-to-end cyberattack chain to identify 'bottlenecks', i.e. the phases most susceptible to AI-driven disruption. By analyzing over 12,000 real-world incidents, the research concludes that current AI primarily enhances attacker speed and scale rather than creating novel capabilities, offering critical insights that help defenders prioritize mitigations against the next generation of threats.",
    link: "https://arxiv.org/pdf/2503.11917",
    award: "⭐ Featured Contribution",
    imageUrl: "/publications/deepmind.webp",

}

// Data for authored publications
const publicationsData = [
    {
        title: "Malware Detection in Cloud Native Environments",
        venue: "ACM Artificial Intelligence and Cloud Computing Conference (AICCC) 2024",
        date: "2024",
        authors: ["Brian S. Mitchell", "Ansh Chandnani", "John Carter", "Danai Roumelioti", "Spiros Mancordis"],
        description: "Modern cloud native environments are incredibly dynamic, making them a significant blind spot for traditional security monitoring. To address this, we introduced a novel approach to behavioral malware detection. We engineered a custom tool using eBPF to collect high-fidelity system call data directly from the Linux kernel across entire container clusters.By training machine learning models on this data, our system learned to distinguish normal operational behavior from malicious activity, allowing it to detect high-profile remote code execution (RCE) attacks with near perfect accuracy, thus providing protection against attacks in real-time.",
        link: "https://dl.acm.org/doi/pdf/10.1145/3719384.3719465",
        awards: [],
        imageUrl: "/publications/acm.png",
    },
    {
        title: "Algorithms: Decoding Bias in Messages",
        venue: "Media Literacy for Justice from the American Library Association",
        date: "2022",
        authors: ["Ansh Chandnani", "Denise E. Agosto"],
        description: "As our world becomes increasingly automated, we must ask a critical question: how do we account for the human biases embedded in our algorithms? In this book chapter, my co-author and I explore this, arguing that 'algorithmic literacy' is a fundamental aspect of modern media literacy. We break down how automated systems can absorb and amplify existing prejudices, leading to discriminatory outcomes and polarizing echo chambers. The piece serves as a call to action for readers to critically question the invisible forces shaping their digital world and to understand how this technology impacts the pursuit of social justice.",
        link: "https://alastore.ala.org/ml4j",
        awards: [],
        imageUrl: "/publications/ala.webp",
    },
    {
        title: "Ontology Modelling of Industrial Control System Ethical Hacking",
        venue: "16th International Conference on Cyber Warfare and Security (ICCWS) 2021",
        date: "2021",
        authors: ["Thomas Heverin", "Ansh Chandnani", "Cate Lopez", "Nirav Brahmbhatt"],
        description: "Ethical hacking of critical infrastructure, like power grids and manufacturing plants, is incredibly complex. Security professionals face a massive challenge in connecting disparate information from numerous sources, from unique software versions and protocols to specific vulnerabilities and known exploits.  In this paper, we proposed a novel solution to automate this process. We designed and built a cybersecurity ontology, a knowledge graph that models the domain of industrial control systems (ICS). By representing this complex data semantically, our model allows an ethical hacker to run a single query and instantly see the connections between a piece of software, its vulnerabilities, and available exploits. Streamlining a task that previously required hours of manual research. This work lays the foundation for a new generation of automated tools to help secure our most critical systems.",
        link: "https://par.nsf.gov/servlets/purl/10327905",
        awards: [
            "🏆 Best Presentation, Stanford Research Conference 2021",
            "📄 Presented at Harvard National Collegiate Research Conference 2020",
        ],
        imageUrl: "/publications/iccws.jpeg",
    },
];

export default function PublicationsPage() {
    return (
        <main className="min-h-screen pt-6 md:pt-24 pb-16">
            <div className="container mx-auto px-4">
                <div className="flex flex-col items-center text-center gap-4">
                    <Feather className="h-12 w-12 text-primary" />
                    <SectionHeading
                        title="Publications"
                        subtitle="My research papers, articles, and other published works."
                    />
                </div>

                <div className="max-w-5xl mx-auto space-y-16">
                    {/* --- Featured Contribution Section --- */}
                    <div>
                        <h2 className="text-3xl font-bold mb-8 text-center md:text-left">Featured Contributions</h2>
                        <div className="flex flex-col md:flex-row md:gap-8">
                            <div className="md:w-1/3 flex-shrink-0 mb-4 md:mb-0">
                                {featuredContributions.imageUrl && (
                                    <div className="relative aspect-video overflow-hidden rounded-lg mb-4 border border-border">
                                        <NextImage src={featuredContributions.imageUrl} alt={`Thumbnail for ${featuredContributions.title}`} fill className="object-cover" />
                                    </div>
                                )}
                                <h4 className="font-semibold text-primary">{featuredContributions.venue}</h4>
                                <p className="text-sm text-muted-foreground">{featuredContributions.date}</p>
                                {featuredContributions.award && (
                                    <p className="text-amber-400 text-sm font-medium mt-2">{featuredContributions.award}</p>
                                )}
                                <Button asChild variant="outline" size="sm" className="mt-4">
                                    <Link href={featuredContributions.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                        Read Publication <ExternalLink className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            <div className="flex-grow">
                                <h3 className="text-2xl font-bold mb-1">{featuredContributions.title}</h3>
                                <p className="text-muted-foreground italic mb-4">{featuredContributions.contribution}</p>
                                <p className="text-lg">{featuredContributions.description}</p>
                            </div>
                        </div>
                    </div>

                    {/* --- Peer-Reviewed Publications Section --- */}
                    <div>
                        <h2 className="text-3xl font-bold mb-8 text-center md:text-left">Authorships</h2>
                        <div className="space-y-16">
                            {publicationsData.map((item, index) => (
                                <div
                                    key={index}
                                    id={
                                        item.venue.includes("ICCWS")
                                        ? "iccws-2021"
                                        : item.venue.includes("ACM")
                                        ? "acm-aiccc-2024"
                                        : undefined
                                    }
                                    className="flex flex-col md:flex-row md:gap-8 scroll-mt-36"
                                >
                                    <div className="md:w-1/3 flex-shrink-0 mb-4 md:mb-0">
                                        {item.imageUrl && (
                                            <div className="relative aspect-video overflow-hidden rounded-lg mb-4 border border-border">
                                                <NextImage src={item.imageUrl} alt={`Thumbnail for ${item.title}`} fill className="object-cover" />
                                            </div>
                                        )}
                                        <h4 className="font-semibold text-primary">{item.venue}</h4>
                                        <p className="text-sm text-muted-foreground">{item.date}</p>
                                        {item.awards && item.awards.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {item.awards.map((award, i) => (
                                                    <p key={i} className="text-amber-400 text-sm font-medium">
                                                        {award}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                        <Button asChild variant="outline" size="sm" className="mt-4">
                                            <Link href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                                Read Publication <ExternalLink className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className="text-2xl font-bold mb-1">{item.title}</h3>
                                        <p className="text-muted-foreground italic mb-4">
                                            {item.authors.map((author, i) => (
                                                <React.Fragment key={i}>
                                                    {i > 0 && ", "}
                                                    <span className={author === "Ansh Chandnani" ? "font-semibold text-[#00ff00]" : ""}>
                                                        {author}
                                                    </span>
                                                </React.Fragment>
                                            ))}
                                        </p>
                                        <p className="text-lg text-foreground">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
