"use client"

import { TypeAnimation } from "react-type-animation"

export default function TypingAnimation() {
    return (
        <TypeAnimation
            sequence={[
                "Security Engineer",
                1500,
                "Hacker",
                1500,
                "Debater",
                1500,
                "Researcher",
                1500,
                "Swimmer",
                1500,
            ]}
            wrapper="span"
            speed={50}
            className="text-xl text-muted-foreground"
            repeat={Infinity}
        />
    )
}
