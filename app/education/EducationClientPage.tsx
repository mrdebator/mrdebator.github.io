"use client"

import SectionHeading from "@/components/section-heading"
import NextImage from "next/image";
import { CalendarDays, Star, GraduationCap } from "lucide-react"

export default function EducationClientPage() {
    const educationData = [
        {
            schoolName: "Drexel University",
            degree: "B.S. in Computing & Security Technology, minor in Computer Science",
            period: "September 2019 - June 2023",
            gpa: "CGPA: 3.91 / 4.0",
            logo: "/logos/drexel.png",
            activities: "Drexel Cyberdragons (Cybersecurity Club), Drexel Algorithms & Data Structures",
            achievements: [
                "Graduated Summa Cum Laude",
                "🏆 A* Award from the Department of Computer Science",
                "🏆 Distinguished Service Award for Outstanding Leadership from the Department of Information Science",
                "🏆 Best Senior Design Project in Computing & Security Technology",
                "Second Runners-Up Senior Design Project in the College of Computing & Informatics",
                "President of Drexel Cyberdragons, 2022 - 2023",
                "Vice-President of Drexel Cyberdragons, 2021 - 2022",
            ],
        },
        {
            schoolName: "Birla High School",
            degree: "High School",
            period: "April 2015 - April 2019",
            gpa: "AISSCE: 93.8%, 99% in Computer Science",
            logo: "/logos/bhs.jpeg",
            activities: "Debate Team, Model UN Team, Swimming Team",
            achievements: [
                "Cultural Secretary for 2018-19",
                "Captain of Netaji House for 2017-18",
                "🏆 S.P. Banerjee Award for Excellence",
                "Chairperson of the Model United Nations Society and Intra-MUN 2018",
                "Attended the Global Young Leaders' Conference (GYLC) 2018 in Washington DC",
                "Runners-up in the Asian Regional Space Settlement Design Competition (ARSSDC) 2017",
                "Member of the debating team with several accolades",
            ],
        },
    ];

    return (
        <main className="min-h-screen pt-6 md:pt-24 pb-16">
            <div className="container mx-auto px-4">
                <div className="flex flex-col items-center text-center gap-4">
                    <GraduationCap className="h-16 w-16 text-primary" />
                    <SectionHeading
                        title="Education"
                        subtitle="My academic background and the institutions that shaped me."
                    />
                </div>

                <div className="max-w-4xl mx-auto space-y-12">
                    {educationData.map((item, index) => (
                        <div key={index} className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left md:gap-8">
                            <div className="flex-shrink-0 relative w-32 h-32 md:w-40 md:h-40 rounded-full mb-4 md:mb-0 flex items-center justify-center bg-card shadow-md p-4 overflow-hidden">
                                <NextImage
                                    src={item.logo}
                                    alt={`${item.schoolName} logo`}
                                    fill
                                    className="object-contain"
                                />
                            </div>

                            <div className="flex-grow">
                                <h3 className="font-bold text-3xl">{item.schoolName}</h3>
                                <p className="text-primary font-semibold text-xl">{item.degree}</p>

                                {item.gpa && (
                                    <div className="flex items-center justify-center md:justify-start text-base font-medium text-muted-foreground mt-2">
                                        <Star className="h-4 w-4 mr-1.5 text-amber-500" fill="currentColor" />
                                        <span>{item.gpa}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-center md:justify-start text-base text-muted-foreground mt-1 mb-4">
                                    <CalendarDays className="h-4 w-4 mr-1.5" />
                                    <span>{item.period}</span>
                                </div>

                                <div className="space-y-4 text-left text-lg">
                                    <div>
                                        <h4 className="font-semibold mb-1">Activities & Societies:</h4>
                                        <p className="text-muted-foreground">{item.activities}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Achievements:</h4>
                                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                            {item.achievements.map((ach, i) => (
                                                <li key={i}>{ach}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    )
}
