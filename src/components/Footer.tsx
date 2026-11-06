'use client';

import Link from 'next/link';
import Logo from './Logo';
import { docsUrl } from '@/lib/docs';
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
            { name: t('footer.product.roadmap'), href: '/roadmap' },
            { name: t('footer.product.changelog'), href: '/changelog' },
        ],
        company: [
            { name: t('footer.company.about'), href: '/about' },
            { name: t('footer.company.contact'), href: '/contact' },
        ],
        legal: [
            { name: t('footer.legal.privacy'), href: '/privacy' },
            { name: t('footer.legal.terms'), href: '/terms' },
            { name: t('footer.legal.imprint'), href: '/imprint' },
        ],
    };

    const linkClass = 'inline-flex min-h-9 items-center text-sm text-muted-foreground transition-colors hover:text-foreground';
    const groups: { title: string; links: { name: string; href: string }[] }[] = [
        { title: t('footer.product.title'), links: footerLinks.product },
        { title: t('footer.company.title'), links: footerLinks.company },
    ];

    return (
        <footer className="border-t border-border bg-background">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
                    <div className="space-y-4">
                        <Link href="/" className="inline-flex items-center transition-opacity hover:opacity-80">
                            <Logo />
                        </Link>
                        <p className="max-w-xs text-sm leading-6 text-muted-foreground">{t('footer.tagline')}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
                        {groups.map((group) => (
                            <div key={group.title}>
                                <h3 className="text-sm font-medium text-foreground">{group.title}</h3>
                                <ul role="list" className="mt-3 space-y-1">
                                    {group.links.map((item) => (
                                        <li key={item.href}>
                                            <Link href={item.href} className={linkClass}>
                                                {item.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                        <div>
                            <h3 className="text-sm font-medium text-foreground">{t('footer.legal.title')}</h3>
                            <ul role="list" className="mt-3 space-y-1">
                                {footerLinks.legal.map((item) => (
                                    <li key={item.href}>
                                        <Link href={item.href} className={linkClass}>
                                            {item.name}
                                        </Link>
                                    </li>
                                ))}
                                <li>
                                    <a href={docsUrl()} target="_blank" rel="noopener noreferrer" aria-label={t('help.nav.label')} className={linkClass}>
                                        {t('help.nav')}
                                    </a>
                                </li>
                                <li>
                                    <button type="button" onClick={openCookieSettings} className={linkClass}>
                                        {t('footer.cookie_settings')}
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-12 border-t border-border pt-6">
                    <p className="text-xs text-muted-foreground">
                        &copy; {currentYear} MyVerein, {t('footer.rights')}
                    </p>
                </div>
            </div>
        </footer>
    );
}
