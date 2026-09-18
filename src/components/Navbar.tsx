'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X, Globe } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { supportedLanguages, type Language } from '@/contexts/supportedLanguages';
import { ThemeToggle } from '@/components/ThemeToggle';

export interface NavItem {
    name: string;
    href: string;
}

export interface HeaderProps {
    mainLinks: NavItem[];
    logo: ReactNode;
    guestNav?: ReactNode;
    mobileGuestNav?: ReactNode;
}

export function Navbar({
    mainLinks,
    logo,
    guestNav,
    mobileGuestNav,
}: HeaderProps) {
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const { language, setLanguage, t } = useLanguage();

    const langRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            // Close Language Dropdown
            if (
                langRef.current &&
                !langRef.current.contains(event.target as Node)
            ) {
                setIsLangOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close menus on route change
    useEffect(() => {
        // Resets transient UI state (open menus) when a prop (the route) changes
        // -- the documented "adjusting state when a prop changes" exception.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLangOpen(false);
        setIsMobileMenuOpen(false);
    }, [pathname]);

    // Helper to switch language and close menu
    const handleLanguageChange = (lang: Language) => {
        setLanguage(lang);
        setIsLangOpen(false);
    };

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md transition-all">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* --- LEFT: LOGO & NAV --- */}
                <div className="flex items-center gap-8">
                    <Link
                        href="/"
                        className="flex items-center gap-2 transition-opacity hover:opacity-80"
                    >
                        {logo}
                    </Link>

                    <div className="hidden md:flex md:gap-6">
                        {mainLinks.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`text-sm font-medium transition-colors duration-200 ${
                                        isActive
                                            ? 'text-primary'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {t(link.name)}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* --- RIGHT: THEME, LANGUAGE & GUEST NAV --- */}
                <div className="flex items-center gap-4">
                    {/* 0. THEME TOGGLE (always visible; color palette lives in Settings) */}
                    <ThemeToggle />

                    {/* 1. LANGUAGE DROPDOWN (Desktop) */}
                    <div className="relative hidden md:block" ref={langRef}>
                        <button
                            onClick={() => setIsLangOpen(!isLangOpen)}
                            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <Globe size={18} />
                            <span>{supportedLanguages.find((l) => l.id === language)?.flag}</span>
                            <ChevronDown
                                size={14}
                                className={`transition-transform duration-200 ${
                                    isLangOpen ? 'rotate-180' : ''
                                }`}
                            />
                        </button>

                        {isLangOpen && (
                            <div className="absolute right-0 mt-2 max-h-80 w-44 origin-top-right animate-in fade-in zoom-in-95 duration-100 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-lg ring-1 ring-black/5 focus:outline-none">
                                <div className="flex flex-col gap-1">
                                    {supportedLanguages.map((lang) => (
                                        <button
                                            key={lang.id}
                                            onClick={() => handleLanguageChange(lang.id)}
                                            className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                                language === lang.id
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-muted text-muted-foreground hover:bg-border'
                                            }`}
                                        >
                                            <span>{lang.nativeLabel}</span>
                                            <span className="text-base">{lang.flag}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. GUEST NAV (Desktop) */}
                    <div className="hidden md:block">{guestNav}</div>

                    {/* Mobile Toggle Button */}
                    <button
                        className="flex md:hidden items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? (
                            <X size={24} />
                        ) : (
                            <Menu size={24} />
                        )}
                    </button>
                </div>
            </div>

            {/* --- MOBILE NAVIGATION MENU --- */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-border bg-background px-4 py-4 shadow-lg animate-in slide-in-from-top-2">
                    <div className="flex flex-col space-y-3">
                        {mainLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`block rounded-md px-3 py-2 text-base font-medium transition-colors ${
                                    pathname === link.href
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                {t(link.name)}
                            </Link>
                        ))}

                        {/* Mobile Language Selector */}
                        <div className="flex flex-col gap-2 px-3 py-2 border-t border-border mt-2 pt-3">
                            <span className="text-sm font-medium text-muted-foreground">
                                {t('nav.language_label')}
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {supportedLanguages.map((lang) => (
                                    <button
                                        key={lang.id}
                                        onClick={() => handleLanguageChange(lang.id)}
                                        className={`px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                                            language === lang.id
                                                ? 'bg-green-600 text-white'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {lang.nativeLabel} {lang.flag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Mobile Guest Buttons */}
                        {mobileGuestNav && (
                            <div className="mt-2 border-t border-border pt-4">
                                {mobileGuestNav}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
