import SectionHeading from "@/components/section-heading"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Newspaper, Mic, Users, Video } from "lucide-react"
import Link from "next/link"
import NextImage from "next/image"

export const metadata = {
    title: "Media",
    description: "My features, talks, and content across various media platforms.",
}

const mediaData = [
    // Category: Invited Talks & Features
    {
        category: "Invited Talks & Features",
        title: "42 Breaches: A Red Teamer's Guide",
        platform: "HackTheBox - CubeCast Podcast",
        description: "A deep dive into my career path, discussing offensive security, red teaming, and advice for aspiring professionals.",
        link: "https://open.spotify.com/episode/7EUIUtQiDj61YLMswY4r7P",
        imageUrl: "/media/cubecast.jpeg",
    },
    {
        category: "Invited Talks & Features",
        title: "Guest Lecture: Cybersecurity 101",
        platform: "Northeastern University",
        description: "Invited to speak about the critical role of cybersecurity in today's business world, the evolving landscape of threats, and best practices for personal security.",
        link: "https://www.linkedin.com/posts/anshchandnani_guestlecture-cybersecurity-education-activity-7318535303529410561-kCRr",
        imageUrl: "/media/northeastern.jpg",
    },
    {
        category: "Invited Talks & Features",
        title: "Technical.ly Interview - Featured on Campus Billboards",
        platform: "Technical.ly Philly & Drexel University",
        description: "My interview on my big-tech co-op experiences was featured by the university on digital billboards across campus.",
        link: "https://technical.ly/professional-development/whats-it-like-intern-big-tech-company-google-amazon-meta/",
        imageUrl: "/media/technically_billboard.jpg",
    },
    {
        category: "Invited Talks & Features",
        title: "CTFs to Google: Real Lessons from a Cybersecurity Pro",
        platform: "Defense Logic Blog, by Kartavya Ojha",
        description: "A featured post from a mentee in the cybersecurity field, reflecting on my journey and lessons learned.",
        link: "https://defencelogic.wordpress.com/2025/08/28/the-journey-from-ctfs-to-google-real-lessons-from-a-cybersecurity-pro/",
        imageUrl: "/media/forbes.jpg",
    },
    {
        category: "Invited Talks & Features",
        title: "Learning From the Best of the Best",
        platform: "Manuel Meinen, Cybersecurity Analyst at Die Mobiliar",
        description: "A fellow cybersecurity analyst's reflection on our inspiring conversation, detailing his key takeaways on the future of AI in cybersecurity.",
        link: "https://www.linkedin.com/posts/manuel-meinen_my-blog-post-of-week-3-is-out-many-thanks-activity-7368366749219442689-pEMr?utm_source=share&utm_medium=member_desktop&rcm=ACoAACPL5p4BxRYQ_MPXT2Nrj13rZYWZkkr-pqo",
        imageUrl: "/media/manuels-blog.jpeg",
    },
    {
        category: "Invited Talks & Features",
        title: "Guest Lecture: AI in Project Management",
        platform: "Drexel University (as Teaching Assistant)",
        description: "Delivered a lecture to senior-level students on the practical applications and challenges of integrating AI into modern project management workflows.",
        link: "https://youtu.be/LuvLLymq49M",
        imageUrl: "/media/gemini-lecturer.png",
    },
    // Category: Panels & Collaborations
    {
        category: "Panels & Collaborations",
        title: "FAANG Intern Panel",
        platform: "Society of Asian Scientists and Engineers (SASE)",
        description: "Shared my internship experiences and advice with students as part of a panel with peers from top tech companies organized by the Society of Asian Scientists and Engineers (SASE). A full recording of the panel is available upon request.",
        link: "https://www.linkedin.com/posts/anshchandnani_intern-university-tech-activity-6996823618592591872-bE_b?utm_source=share&utm_medium=member_desktop&rcm=ACoAACPL5p4BxRYQ_MPXT2Nrj13rZYWZkkr-pqo",
        imageUrl: "/media/sase.jpeg",
    },
    {
        category: "Panels & Collaborations",
        title: "Cracking the Security Engineering Interview",
        platform: "Exponent (YouTube Collaboration)",
        description: "Invited by Exponent to demonstrate Security Engineering Interview, answering the question, 'How does the internet work?'.",
        link: "https://youtu.be/GM9yGj5tdHc?si=9AG41lYFI2GSSWPl",
        imageUrl: "/media/exponent.jpg",
    },
    // Category: Content Creation & Online Presence
    {
        category: "Content Creation & Online Presence",
        title: "Day in the Life of a Google Cybersecurity Intern",
        platform: "YouTube",
        description: "I thought I'd hop on the trend and show you what a day in the life of a Google Security Engineering Intern looks like.",
        link: "https://youtu.be/j8F03zorZgk?si=XrSS96NWzpmBrrhH",
        imageUrl: "/media/day-in-the-life.jpg",
    },
    {
        category: "Content Creation & Online Presence",
        title: "My First Internship Experience",
        platform: "LinkedIn",
        description: "A post I made reflecting on my first co-op experience garnered some attention.",
        link: "https://www.linkedin.com/posts/anshchandnani_security-team-engineering-activity-6782391235421188096-dBd5?utm_source=share&utm_medium=member_desktop&rcm=ACoAACPL5p4BxRYQ_MPXT2Nrj13rZYWZkkr-pqo",
        imageUrl: "/media/sig.jpeg",
    },
];

// Define the order and icons for the categories
const categories = [
    { name: "Invited Talks & Features", icon: Mic },
    { name: "Panels & Collaborations", icon: Users },
    { name: "Content Creation & Online Presence", icon: Video },
];

export default function MediaPage() {
    return (
        <main className="min-h-screen pt-6 md:pt-24 pb-16">
            <div className="container mx-auto px-4">
                <div className="flex flex-col items-center text-center gap-4">
                    <Newspaper className="h-12 w-12 text-primary" />
                    <SectionHeading
                        title="Media"
                        subtitle="My features, talks, panels, and content across various platforms."
                    />
                </div>

                <div className="max-w-6xl mx-auto space-y-12">
                    {categories.map((category) => (
                        <section key={category.name}>
                            <div className="flex items-center gap-3 mb-8">
                                <category.icon className="h-8 w-8 text-primary" />
                                <h2 className="text-3xl font-bold">{category.name}</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                                {mediaData
                                    .filter((item) => item.category === category.name)
                                    .map((item) => (
                                        <Card key={item.title} className="bg-card/50 backdrop-blur-sm overflow-hidden group">
                                            <Link href={item.link} target="_blank" rel="noopener noreferrer">
                                                <div className="relative aspect-video overflow-hidden">
                                                    <NextImage
                                                        src={item.imageUrl}
                                                        alt={`Thumbnail for ${item.title}`}
                                                        fill
                                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                                        <p className="text-center text-white text-sm">{item.description}</p>
                                                    </div>
                                                </div>
                                                <CardHeader>
                                                    <CardTitle className="text-xl">{item.title}</CardTitle>
                                                    <p className="text-base text-foreground">{item.platform}</p>
                                                </CardHeader>
                                            </Link>
                                        </Card>
                                    ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </main>
    );
}
