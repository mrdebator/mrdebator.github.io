import Link from "next/link";
import {
    SiLinkedin,
    SiGithub,
    SiGooglescholar,
    SiWordpress
} from "react-icons/si";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    const socialLinks = [
        {
            name: "LinkedIn",
            href: "https://linkedin.com/in/anshchandnani",
            icon: SiLinkedin
        },
        {
            name: "GitHub",
            href: "https://github.com/mrdebator",
            icon: SiGithub
        },
    ];

    return (
        <footer className="py-8">
            <div className="container mx-auto px-4 flex flex-col items-center gap-4 md:flex-row md:justify-between">
                <p className="text-sm text-muted-foreground">
                    &copy; {currentYear} / Ansh Chandnani
                </p>

                <div className="flex items-center gap-6">
                    {socialLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground transition-colors hover:text-primary"
                        >
                            <link.icon className="h-5 w-5" />
                            <span className="sr-only">{link.name}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </footer>
    );
}
