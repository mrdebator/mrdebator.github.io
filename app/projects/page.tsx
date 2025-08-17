import SectionHeading from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Code, ExternalLink } from "lucide-react";
import NextImage from "next/image";
import Link from "next/link";
import TextWithLinks from "@/components/text-with-links";

export const metadata = {
    title: "Projects",
    description: "A selection of my most impactful projects, from research prototypes to community infrastructure.",
};

const projectsData = [
    {
        name: "Claros",
        tagline: "A query-driven knowledge graph and OSINT automation engine.",
        problem: "Open Source Intelligence (OSINT) is a time-consuming, manual process of following a trail of digital breadcrumbs. This tool automates the discovery and, more importantly, the connection of disparate security information.",
        myRole: "As Project Owner and Lead Developer, I built this tool from concept to deployment for my senior design project, based on my [previously published research](/publications#iccws-2021) at the International Conference on Cyber Warfare & Security (ICCWS) conference.",
        keyFeatures: [
            "Parses NMap scans to automatically discover related domains, vulnerabilities, and exploits.",
            "Constructs a semantic knowledge graph to reveal complex relationships between entities.",
            "Allows analysts to query the graph with SPARQL to accelerate the reconnaissance phase.",
        ],
        techStack: ["Python", "Pydantic", "Pandas", "Ontology/RDF", "SPARQL", "National Vulnerabilities Database (NVD) API", "ExploitDB API"],
        impact: "Claros transforms the manual process of OSINT into an automated workflow. It empowers security analysts to prioritize targets and uncover attack paths with an efficiency comparable to enterprise tools like Bloodhound.",
        links: {
            github: "https://github.com/mrdebator/claros",
        },
        visual: "/projects/claros.png",
    },
    {
        name: "sysmonitor-ebpf",
        tagline: "A high-performance, kernel-level data collection utility for cloud-native environments.",
        problem: "Traditional 'sidecar' monitoring in container deployments can be cumbersome and resource-intensive. We needed a more efficient way to gain deep visibility for threat detection.",
        myRole: "As a key research contributor, I co-designed the monitor, developed the kernel-level network logging module using C and eBPF, and orchestrated the vulnerable cloud-native environments for testing and validation.",
        keyFeatures: [
            "Deploys at the hypervisor level, providing namespace-aware monitoring without per-container configuration.",
            "Uses eBPF and ring buffers for highly efficient, low-overhead data collection at the kernel level.",
            "Provides holistic visibility into both system calls and network events for robust threat detection.",
        ],
        techStack: ["Go", "C", "eBPF", "Docker", "Kubernetes"],
        impact: "This work, [published at the prestigious ACM AICCC conference](/publications#acm-aiccc-2024), presents a more efficient alternative to traditional sidecar monitoring and serves as the foundation for modern cloud-native security tools.",
        links: {
            github: "https://github.com/mrdebator/sysmonitor-ebpf",
        },
        visual: "/projects/sysmonitor.png",
    },
    {
        name: "Cybersecurity Training Lab",
        tagline: "A custom, sandboxed lab environment for hands-on cybersecurity education.",
        problem: "Drexel's cybersecurity club, with over 500 members, lacked the dedicated infrastructure to safely practice offensive and defensive security techniques without risk to the university network.",
        myRole: "As [President of Drexel Cyberdragons](/involvements#president), I designed and led the implementation of this critical infrastructure, including all network configuration, VLAN segmentation, and Proxmox-based virtual machine orchestration on recycled enterprise servers.",
        keyFeatures: [
            "Features VLAN-segmented networks to isolate vulnerable machines from attacker VMs and the campus network.",
            "Provides on-demand Kali Linux instances, removing hardware constraints for students and faculty.",
            "Accessible via a dedicated local Wi-Fi network for easy, VPN-free access during workshops.",
        ],
        techStack: ["Proxmox VE", "Linux", "UniFi Networking", "Tailscale"],
        impact: "This lab provided a secure, sandboxed environment that enabled 500+ students to safely practice and develop advanced skills in penetration testing, incident response, and systems administration.",
        links: {}, // No public links for this one
        visual: "/projects/server.jpg",
    },
];


export default function ProjectsPage() {
    return (
        <main className="min-h-screen pt-6 md:pt-24 pb-16">
            <div className="container mx-auto px-4">
                <div className="flex flex-col items-center text-center gap-4">
                    <Code className="h-12 w-12 text-primary" />
                    <SectionHeading
                        title="Projects"
                        subtitle="A selection of my most impactful projects, from research prototypes to community infrastructure."
                    />
                </div>

                <div className="max-w-5xl mx-auto space-y-16">
                    {projectsData.map((project) => (
                        <div key={project.name} className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 items-start">
                            {/* Left Column: Visual & Links */}
                            <div className="md:col-span-1">
                                <div className="relative aspect-video rounded-lg overflow-hidden border border-border shadow-lg mb-4 bg-white">
                                    <NextImage src={project.visual} alt={`Visual for ${project.name}`} fill className="object-contain" />
                                </div>
                                <div className="flex items-center gap-4">
                                    {project.links.github && (
                                        <Button asChild className="w-full">
                                            <Link href={project.links.github} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4 mr-2" /> View on GitHub
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Details */}
                            <div className="md:col-span-2">
                                <p className="text-foreground font-semibold">{project.tagline}</p>
                                <h3 className="text-3xl font-bold mt-1">{project.name}</h3>

                                <div className="mt-4 space-y-6 text-lg">
                                    <div>
                                        <h4 className="font-semibold mb-1">My Role</h4>
                                        <p className="text-muted-foreground">
                                            <TextWithLinks text={project.myRole} />
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1 text-foreground">Key Features</h4>
                                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                            {project.keyFeatures.map((feature, i) => <li key={i}>{feature}</li>)}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1 text-foreground">Tech Stack</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {project.techStack.map((tech) => <Badge key={tech} variant="secondary">{tech}</Badge>)}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1 text-foreground">Impact & Significance</h4>
                                        <p className="text-muted-foreground">
                                            <TextWithLinks text={project.impact} />
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
