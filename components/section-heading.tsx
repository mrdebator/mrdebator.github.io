interface SectionHeadingProps {
    title: string
    subtitle?: string
}

export default function SectionHeading({ title, subtitle }: SectionHeadingProps) {
    return (
        <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
            {subtitle && <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>}
        </div>
    )
}
