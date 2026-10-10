/**
 * Standard Domain Taxonomy for The Compendium.
 * Source of truth: SecondBrainVault/Tech/Domains.md
 */

export interface DomainMeta {
    id: string;
    name: string;
    slug: string;
    description: string;
}

export const COMPENDIUM_DOMAINS: DomainMeta[] = [
    {
        id: "os-internals",
        name: "Operating Systems Internals",
        slug: "operating-systems-internals",
        description: "Kernel architecture, memory management, page tables, VMA trees, scheduling, and hardware-software boundary.",
    },
    {
        id: "ethical-hacking",
        name: "Ethical Hacking & Penetration Testing",
        slug: "ethical-hacking-penetration-testing",
        description: "Offensive security research, exploitation engineering, post-exploitation, telemetry evasion, and red teaming.",
    },
    {
        id: "networks",
        name: "Computer Networks & Protocols",
        slug: "computer-networks-protocols",
        description: "Network stack internals, raw sockets, packet telemetry, routing topologies, and wire protocol security.",
    },
    {
        id: "cryptography",
        name: "Cryptography",
        slug: "cryptography",
        description: "Applied cryptosystems, key exchange protocols, post-quantum cryptography, and cryptographic implementation safety.",
    },
    {
        id: "software-engineering",
        name: "Programming & Software Engineering",
        slug: "programming-software-engineering",
        description: "Language runtimes, compiler theory, systems programming in C/Rust/Go, algorithms, and high-assurance architecture.",
    },
    {
        id: "hardware-embedded",
        name: "Hardware, Firmware, & Embedded Solutions",
        slug: "hardware-firmware-embedded-solutions",
        description: "DMA hardware security, PCIe peripherals, microcontroller firmware, physical memory buses, and embedded tooling.",
    },
    {
        id: "web-apps",
        name: "Web Applications",
        slug: "web-applications",
        description: "Modern web standards, protocol attacks, browser security models, and high-performance full-stack systems.",
    },
    {
        id: "cloud-native",
        name: "Cloud Native",
        slug: "cloud-native",
        description: "Containerization internals, Linux namespaces/cgroups, orchestration, isolation primitives, and multi-tenant systems.",
    },
    {
        id: "sysadmin",
        name: "Systems Administration",
        slug: "systems-administration",
        description: "Infrastructure reliability, Linux environment engineering, automated observability, and core operating system services.",
    },
    {
        id: "auth",
        name: "Authentication & Authorization",
        slug: "authentication-authorization",
        description: "Identity federations, Kerberos/AD security, OAuth/OIDC protocols, access control matrices, and privilege delegation.",
    },
    {
        id: "mobile",
        name: "Mobile Platforms",
        slug: "mobile-platforms",
        description: "Android/iOS security models, mobile kernelsandboxing, IPC mechanisms, and baseband/hardware architecture.",
    },
    {
        id: "ai-ml",
        name: "Artificial Intelligence (AI) & Machine Learning (ML)",
        slug: "artificial-intelligence-machine-learning",
        description: "Machine learning systems, agentic architectures, transformer optimization, and adversarial AI security.",
    },
    {
        id: "tools-technologies",
        name: "Tools & Technologies",
        slug: "tools-technologies",
        description: "Instrumentation utilities, debuggers, fuzzers, trace analyzers, and productivity engineering environments.",
    },
    {
        id: "leadership",
        name: "Program & Leadership",
        slug: "program-leadership",
        description: "Security program strategy, CTF competition operations, research mentorship, and community infrastructure.",
    },
];

const DOMAIN_NAME_MAP = new Map<string, DomainMeta>();
const DOMAIN_SLUG_MAP = new Map<string, DomainMeta>();

for (const d of COMPENDIUM_DOMAINS) {
    DOMAIN_NAME_MAP.set(d.name.toLowerCase().trim(), d);
    DOMAIN_SLUG_MAP.set(d.slug.toLowerCase().trim(), d);
}

/**
 * Normalizes a raw domain string (which may contain `[[...]]`) into a canonical DomainMeta.
 * Returns null if not recognized.
 */
export function normalizeDomain(rawDomain: string): DomainMeta | null {
    if (!rawDomain) return null;
    const cleaned = rawDomain.replace(/^\[\[/, "").replace(/\]\]$/, "").trim().toLowerCase();
    return DOMAIN_NAME_MAP.get(cleaned) || DOMAIN_SLUG_MAP.get(cleaned) || null;
}

/**
 * Validates whether a raw domain name is a member of the official taxonomy.
 */
export function isValidDomain(rawDomain: string): boolean {
    return normalizeDomain(rawDomain) !== null;
}
