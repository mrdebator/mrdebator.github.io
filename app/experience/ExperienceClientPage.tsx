"use client"

import SectionHeading from "@/components/section-heading"
import NextImage from "next/image";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { motion } from "framer-motion";

const experienceData = [
    {
        companyName: "Google",
        location: "Sunnyvale, CA",
        logo: "/logos/google.svg",
        companyUrl: "https://about.google/",
        positions: [
            {
                title: "Security Engineer, Offensive Security",
                period: "July 2023 - Present",
                description: [
                    "Designing and executing realistic red team exercises using novel Tactics, Techniques, & Procedures (TTPs) against several client-centric and enterprise products to improve Google's security posture.",
                    "Architecting and developing tools to support penetration tests through the reconnaissance and post-exploitation phases resulting in increased operator convenience and stealthier attacks.",
                    "Collaborating across teams on security reviews, vulnerability taxonomies, and helping organize security events such as the BSidesSF CTF, Red Team Summit, and HackTheCity at SaferWithGoogle.",
                ],
            },
            {
                title: "Security Engineering Intern, Offensive Security",
                period: "June 2022 - September 2022",
                description: [
                    "Conducted extensive Open Source Intelligence (OSINT) investigations to identify foothold vectors on Google's production & corporate environments.",
                    "Introduced query-capable knowledge graphs, and through subsequent automation, saved operators 2+ weeks of reconnaissance time.",
                    "Collaborated on a specialized penetration test, safely simulating insider risks, that targeted critical production infrastructure, resulting in a broader push for healthier credential habits.",
                ],
            },
            {
                title: "Security Engineering Intern, Threat Detection",
                period: "June 2021 - September 2021",
                description: [
                    "Designed & built a platform and OS agnostic Zeek script validation tool using Go and the Google Cloud Platform to provide a strandardized testing environment for threat detection automation.",
                    "Implemented the tool as an on-demand utility with a custom Docker image, reducing the testing time to 60 seconds.",
                    "Assisted the Corp Task Force in threat detection and analysis to mitigate insider threats and permission creep.",
                ],
            },
        ],
    },
    {
        companyName: "Susquehanna International Group",
        location: "Bala Cynwyd, PA",
        logo: "/logos/sig.png",
        companyUrl: "https://sig.com/",
        positions: [
            {
                title: "Cybersecurity Coop, Firewall Services",
                period: "September 2020 - March 2021",
                description: [
                    "Designed & built a Rule Lookup tool using Python3 and custom APIs, automating manual firewall rule lookup operations across all firewalls.",
                    "Configured & managed firewall rules to facilitate secure network access for various services & workstations across global offices and exchanges.",
                    "Collaborated on automation projects for firewall health checks, status alerts, and data-aggregating operations to guarantee up-time during trading hours.",
                ],
            },
        ],
    },
    {
        companyName: "STAR Scholars, Drexel University",
        location: "Philadelphia, PA",
        logo: "/logos/drexel.png",
        companyUrl: "https://drexel.edu/pennoni/urep/undergraduate-research/STAR-scholars/",
        positions: [
            {
                title: "Student Researcher",
                period: "July 2020 - September 2020",
                description: [
                    "Conducted research on leveraging ontologies & semantic graphs, with SPARQL queries, to create contextual representations of security information for Industrial Control Systems (ICS).",
                    "Developed an ontology using Protege to model threats, vulnerabilities, exploits, and critical security information.",
                ],
            },
        ],
    },
    {
        companyName: "Kyrion Technologies",
        location: "Kolkata, India",
        logo: "/logos/kyrion.jpeg",
        companyUrl: "https://kyrion.in",
        positions: [
            {
                title: "Cybersecurity Intern",
                period: "June 2019 - June 2019",
                description: [
                    "Worked on projects involving Password Cracking, Dictionary Attacks, Cross Site Scripting, etc.",
                    "Conducted cost analysis and presented vulnerability reports on widely used hashing algorithms.",
                    "Earned the Microsoft Training Association's Security Fundamentals certification.",
                ],
            },
        ],
    },
];

export const metadata = {
    title: "Work Experience - Your Name Portfolio",
    description: "My professional journey and the roles that have shaped my career.",
};

export default function ExperiencePage() {
    return (
        <main className="min-h-screen pt-6 md:pt-24 pb-16">
            <div className="container mx-auto px-4">
                <div className="flex flex-col items-center text-center gap-4">
                    <Briefcase className="h-12 w-12 text-primary" />
                    <SectionHeading
                        title="Work Experience"
                        subtitle="My professional journey and the roles that have shaped my career."
                    />
                </div>

                <div className="max-w-4xl mx-auto space-y-12">
                    {experienceData.map((job, index) => (
                        <div key={index} className="flex flex-col md:flex-row md:items-start md:gap-8">
                            <Link href={job.companyUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 mx-auto md:mx-0">
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                    className="relative w-32 h-32 md:w-28 md:h-28 rounded-full mb-4 md:mb-0 flex items-center justify-center bg-card shadow-md p-4 overflow-hidden"
                                >
                                    <NextImage
                                        src={job.logo}
                                        alt={`${job.companyName} logo`}
                                        fill
                                        className="object-contain"
                                    />
                                </motion.div>
                            </Link>

                            <div className="flex-grow text-center md:text-left">
                                <h3 className="font-bold text-3xl">{job.companyName}</h3>
                                <p className="text-base text-muted-foreground">{job.location}</p>

                                <div className="mt-4 space-y-6">
                                    {job.positions.map((pos, posIndex) => (
                                        <div key={posIndex}>
                                            <h4 className="font-semibold text-xl text-primary">{pos.title}</h4>
                                            <p className="text-base text-muted-foreground mb-2">{pos.period}</p>
                                            {/* Updated ul to use text-lg for list items */}
                                            <ul className="list-disc pl-5 space-y-1 text-lg text-muted-foreground text-left">
                                                {pos.description.map((desc, descIndex) => (
                                                    <li key={descIndex}>{desc}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    )
}
