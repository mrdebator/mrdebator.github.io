"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Home, Menu, X, GraduationCap, Briefcase, Award, Feather, Newspaper, FileText, Code
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const pathname = usePathname()

    const mainNavLinks = [
        { name: "Education", href: "/education", icon: GraduationCap },
        { name: "Experience", href: "/experience", icon: Briefcase },
        { name: "Awards & Involvements", href: "/involvements", icon: Award },
        { name: "Publications", href: "/publications", icon: Feather },
        { name: "Media", href: "/media", icon: Newspaper },
        { name: "Projects", href: "/projects", icon: Code },
    ]

    const mobileBottomBarLinks = [
        { name: "Home", href: "/", icon: Home },
        { name: "Experience", href: "/experience", icon: Briefcase },
    ]

    const isActive = (path: string) => {
        // Handle the homepage specifically
        if (path === "/") {
            return pathname === "/";
        }
        // For other pages, check if the pathname starts with the link's href
        return pathname.startsWith(path)
    }

    return (
        <>
            {/* --- DESKTOP PILL NAVIGATION --- */}
            <header className="hidden md:flex justify-center fixed top-4 left-0 right-0 z-50">
                <nav className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-full shadow-lg px-3 py-2">
                    <Link href="/" className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${isActive("/") ? "bg-slate-700 text-white" : "text-gray-400 hover:text-white"}`}>
                        <Home className="h-5 w-5" />
                    </Link>

                    <div className="h-6 w-px bg-slate-600 mx-1"></div>

                    {mainNavLinks.map((link) => (
                        <Link key={link.name} href={link.href} className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-sm font-medium ${isActive(link.href) ? "bg-slate-700 text-white" : "text-gray-400 hover:text-white"}`}>
                            <link.icon className="h-5 w-5" />
                            <span>{link.name}</span>
                        </Link>
                    ))}
                    <div className="h-6 w-px bg-slate-600 mx-1"></div>
                    <a href="/AnshC.pdf" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-sm font-medium text-gray-400 hover:text-white">
                        <FileText className="h-5 w-5" />
                    </a>
                </nav>
            </header>

            {/* --- MOBILE NAVIGATION --- */}
            <div className="md:hidden">
                {/* Bottom Bar */}
                <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-full shadow-lg px-4 py-3 z-50">
                    {mobileBottomBarLinks.map((link) => (
                        <Link key={link.name} href={link.href} className={`p-2 rounded-full transition-colors ${isActive(link.href) ? "bg-slate-700 text-white" : "text-gray-400"}`}>
                            <link.icon className="h-6 w-6" />
                        </Link>
                    ))}
                    <button onClick={() => setIsMenuOpen(true)} className="p-2 rounded-full text-gray-400">
                        <Menu className="h-6 w-6" />
                    </button>
                </nav>

                {/* Full Screen Menu (Drawer) */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMenuOpen(false)}
                                className="fixed inset-0 bg-black/60 z-[55]"
                            />
                            {/* Menu Panel */}
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="fixed bottom-0 left-0 right-0 bg-slate-900 rounded-t-2xl p-4 z-[60] border-t border-slate-700"
                            >
                                <div className="container mx-auto">
                                    <button onClick={() => setIsMenuOpen(false)} className="absolute top-4 right-4 text-gray-500">
                                        <X className="h-6 w-6" />
                                    </button>
                                    <div className="pt-8 pb-4 grid grid-cols-3 gap-4 text-center">
                                        {mainNavLinks.map((link) => (
                                            <Link key={link.name} href={link.href} onClick={() => setIsMenuOpen(false)} className="flex flex-col items-center gap-1 text-gray-400">
                                                <link.icon className="h-7 w-7" />
                                                <span className="text-xs">{link.name}</span>
                                            </Link>
                                        ))}
                                        <a href="/AnshC.pdf" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-gray-400">
                                            <FileText className="h-7 w-7" />
                                            <span className="text-xs">Resume</span>
                                        </a>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </>
    )
}
