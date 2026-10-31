import { PUBLIC_ONLY } from './siteMode';

export interface SiteNavItem {
    name: string;
    href: string;
}

/** Public navbar links; the contact entry disappears in public-only mode. */
export function mainNavLinks(publicOnly: boolean = PUBLIC_ONLY): SiteNavItem[] {
    return [
        { name: 'nav.features', href: '/features' },
        { name: 'nav.roadmap', href: '/roadmap' },
        { name: 'nav.changelog', href: '/changelog' },
        ...(publicOnly ? [] : [{ name: 'nav.contact', href: '/contact' }]),
    ];
}

/** Footer "company" column keys + hrefs (labels are translated by the Footer). */
export function footerCompanyLinks(publicOnly: boolean = PUBLIC_ONLY): { key: string; href: string }[] {
    return [
        { key: 'footer.company.about', href: '/about' },
        ...(publicOnly ? [] : [{ key: 'footer.company.contact', href: '/contact' }]),
    ];
}

/** Indexable routes for the sitemap; /contact and /login-signup are left out in public-only mode. */
export function sitemapRoutes(publicOnly: boolean = PUBLIC_ONLY): string[] {
    return [
        '',
        '/features',
        '/about',
        ...(publicOnly ? [] : ['/contact']),
        '/roadmap',
        '/changelog',
        '/imprint',
        '/privacy',
        '/terms',
        ...(publicOnly ? [] : ['/login-signup']),
    ];
}
