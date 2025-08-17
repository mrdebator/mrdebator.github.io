import { Button } from "@/components/ui/button"
import Image from "next/image"
import SocialLinks from "@/components/social-links"
import dynamic from "next/dynamic"
import { Gavel, Feather, Mic } from "lucide-react"

const TypingAnimation = dynamic(
    () => import("@/components/typing-animation"),
    {
        ssr: false,
        loading: () => <p className="text-xl text-muted-foreground">Security Engineer</p>
    }
)

const careerHighlights = [
    {
        icon: Gavel,
        text: "Entrusted by the BSides San Francisco committee to co-organize and judge their annual Capture-the-Flag (CTF) competition.",
    },
    {
        icon: Feather,
        text: "Contributed foundational research to a Google DeepMind paper evaluating the cyberattack capabilities of AI and first-authored a book chapter on algorithmic bias for the American Library Association.",
    },
    {
        icon: Mic,
        text: "Invited to share expertise on advanced security topics at exclusive industry events, including the Red Team Summit and academic conferences at Harvard and Stanford.",
    },
]

export default function Home() {
    return (
        <main className="min-h-screen pt-4 md:pt-24">
            <div className="container mx-auto px-4 flex flex-col items-center">
                <div className="mb-12">
                    <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-4 border-primary">
                        <Image src="/AnshC.png" alt="A portrait of Ansh Chandnani" fill className="object-cover" priority />
                    </div>
                </div>

                <div className="mb-12">
                    <SocialLinks />
                </div>

                <div className="w-full max-w-2xl space-y-6">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                        Hi, I'm <span className="text-[#00ff00]">Ansh</span> Chandnani
                    </h1>

                    <div className="h-8 text-xl text-muted-foreground">
                        a <TypingAnimation />
                    </div>

                    <p className="text-lg">
                        I'm a Security Engineer working in <a href="https://blog.google/technology/safety-security/meet-the-team-responsible-for-hacking-google/" target="_blank" rel="noopener noreferrer" className="text-[#00ff00] hover:underline underline-offset-4">Google's Offensive Security team</a>. <br />
                        I identify, assess, and remediate potential vulnerabilities by conducting penetration tests, researching attack vectors, and developing tools to <a href="https://cloud.google.com/transform/how-google-does-it-red-teaming-at-scale" target="_blank" rel="noopener noreferrer" className="text-[#00ff00] hover:underline underline-offset-4">simulate real-world attacks</a>.
                    </p>

                    <div className="pt-1 text-left">
                        <ul className="space-y-4">
                            {careerHighlights.map((highlight, index) => (
                                <li key={index} className="flex items-start gap-4">
                                    <highlight.icon className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                                    <span className="text-lg">{highlight.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                        <Button
                            size="lg"
                            variant="default"
                            asChild
                            className="text-lg transition-colors hover:bg-transparent hover:text-white hover:border hover:border-white"
                        >
                            <a
                                href="/AnshC.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Resume
                            </a>
                        </Button>
                        <Button
                            size="lg"
                            variant="default"
                            asChild
                            className="text-lg transition-colors hover:bg-transparent hover:text-white hover:border hover:border-white"
                        >
                            <a
                                href="mailto:ansh.chandnani@gmail.com"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Email
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    )
}
