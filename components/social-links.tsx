import Link from "next/link"
import {
    SiLinkedin,
    SiGithub,
    SiGooglescholar,
    SiWordpress
} from "react-icons/si";

export default function SocialLinks() {
    const socialLinks = [
        {
            name: "LinkedIn",
            href: "https://www.linkedin.com/in/anshchandnani/",
            icon: SiLinkedin
        },
        {
            name: "GitHub",
            href: "https://github.com/mrdebator",
            icon: SiGithub
        },
        {
            name: "Google Scholar",
            href: "/publications",
            icon: SiGooglescholar
        },
        {
            name: "WordPress",
            href: "https://metathesis0.wordpress.com/",
            icon: SiWordpress
        },
    ];

    return (
        <div className="flex justify-center items-center gap-10">
            {socialLinks.map((link) => (
                <Link
                    key={link.name}
                    href={link.href}
                    target={link.href.includes("http") ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition-colors hover:text-primary"
                >
                    <link.icon className="h-12 w-12" />
                    <span className="sr-only">{link.name}</span>
                </Link>
            ))}
        </div>
    );
}
