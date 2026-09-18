'use client';

import Link from 'next/link';
import { Github, Twitter, Linkedin } from 'lucide-react';
import Logo from './Logo';
import { useLanguage } from '@/contexts/LanguageContext';

export function Footer() {
    const { t } = useLanguage();
    const currentYear = new Date().getFullYear();

    const openCookieSettings = () => {
        window.dispatchEvent(new Event('open-cookie-settings'));
    };

    const footerLinks = {
        product: [
            { name: t('footer.product.features'), href: '/features' },
            { name: t('footer.product.pricing'), href: '/pricing' },
            { name: t('footer.product.changelog'), href: '/changelog' },
        ],
        company: [
            { name: t('footer.company.about'), href: '/about' },
            { name: t('footer.company.blog'), href: '/blog' },
            { name: t('footer.company.careers'), href: '/careers' },
            { name: t('footer.company.contact'), href: '/contact' },
        ],
        legal: [
            { name: t('footer.legal.privacy'), href: '/privacy' },
            { name: t('footer.legal.terms'), href: '/terms' },
            { name: t('footer.legal.imprint'), href: '/imprint' },
        ],
    };

    return (
        <footer className="bg-background border-t border-border">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <div className="xl:grid xl:grid-cols-3 xl:gap-8">
                    {/* Brand Section */}
                    <div className="space-y-8 xl:col-span-1 justify-self-center">
                        <Link
                            href="/"
                            className="flex items-center gap-2 transition-opacity hover:opacity-80"
                        >
                            <Logo />
                        </Link>
                        <p className="max-w-xs text-sm leading-6 text-muted-foreground">
                            {t('footer.tagline')}
                        </p>
                        <div className="flex space-x-5">
                            <a
                                href="#"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <span className="sr-only">GitHub</span>
                                <Github size={20} strokeWidth={1.5} />
                            </a>
                            <a
                                href="#"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <span className="sr-only">Twitter</span>
                                <Twitter size={20} strokeWidth={1.5} />
                            </a>
                            <a
                                href="#"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <span className="sr-only">LinkedIn</span>
                                <Linkedin size={20} strokeWidth={1.5} />
                            </a>
                        </div>
                    </div>

                    {/* Links Grid */}
                    <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
                        <div className="md:grid md:grid-cols-2 md:gap-8">
                            <div>
                                <h3 className="text-sm font-semibold leading-6 text-foreground">
                                    {t('footer.product.title')}
                                </h3>
                                <ul
                                    role="list"
                                    className="mt-6 space-y-4"
                                >
                                    {footerLinks.product.map((item) => (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className="text-sm leading-6 text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                {item.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="mt-10 md:mt-0">
                                <h3 className="text-sm font-semibold leading-6 text-foreground">
                                    {t('footer.company.title')}
                                </h3>
                                <ul
                                    role="list"
                                    className="mt-6 space-y-4"
                                >
                                    {footerLinks.company.map((item) => (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className="text-sm leading-6 text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                {item.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="md:grid md:grid-cols-2 md:gap-8">
                            <div>
                                <h3 className="text-sm font-semibold leading-6 text-foreground">
                                    {t('footer.legal.title')}
                                </h3>
                                <ul
                                    role="list"
                                    className="mt-6 space-y-4"
                                >
                                    {footerLinks.legal.map((item) => (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className="text-sm leading-6 text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                {item.name}
                                            </Link>
                                        </li>
                                    ))}
                                    <button
                                        onClick={openCookieSettings}
                                        className="text-sm leading-6 text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        {t('footer.cookie_settings')}
                                    </button>
                                </ul>
                            </div>
                            {/* Optional: Newsletter / Status or Empty Column */}
                            <div className="mt-10 md:mt-0">
                                {/* You could put a newsletter signup here later */}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-16 pt-8 sm:mt-20 lg:mt-24 flex flex-col items-center justify-between">
                    <p className="text-xs leading-5 text-muted-foreground">
                        &copy; {currentYear} MyVerein, {t('footer.rights')}
                    </p>
                </div>
            </div>
        </footer>
    );
}
