import { afterEach, describe, expect, it, vi } from 'vitest';

import { footerCompanyLinks, mainNavLinks, sitemapRoutes } from './siteLinks';
import { parsePublicOnly } from './siteMode';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
});

describe('parsePublicOnly', () => {
    it('parses explicit values and falls back otherwise', () => {
        expect(parsePublicOnly('true', false)).toBe(true);
        expect(parsePublicOnly('1', false)).toBe(true);
        expect(parsePublicOnly('false', true)).toBe(false);
        expect(parsePublicOnly('0', true)).toBe(false);
        expect(parsePublicOnly(undefined, true)).toBe(true);
        expect(parsePublicOnly('', false)).toBe(false);
        expect(parsePublicOnly('maybe', true)).toBe(true);
    });
});

describe('PUBLIC_ONLY from env', () => {
    it('defaults to true on this branch', async () => {
        vi.stubEnv('NEXT_PUBLIC_PUBLIC_ONLY', '');
        const { PUBLIC_ONLY } = await import('./siteMode');
        expect(PUBLIC_ONLY).toBe(true);
    });

    it('can be switched off via env', async () => {
        vi.stubEnv('NEXT_PUBLIC_PUBLIC_ONLY', 'false');
        const { PUBLIC_ONLY } = await import('./siteMode');
        expect(PUBLIC_ONLY).toBe(false);
    });
});

describe('public-only link sets', () => {
    it('hides contact in nav, footer and sitemap, and login-signup in the sitemap', () => {
        expect(mainNavLinks(true).map((l) => l.href)).toEqual(['/features', '/roadmap', '/changelog']);
        expect(footerCompanyLinks(true).map((l) => l.href)).toEqual(['/about']);
        const routes = sitemapRoutes(true);
        expect(routes).not.toContain('/contact');
        expect(routes).not.toContain('/login-signup');
        expect(routes).toContain('/imprint');
    });

    it('keeps everything when the mode is off', () => {
        expect(mainNavLinks(false).map((l) => l.href)).toContain('/contact');
        expect(footerCompanyLinks(false).map((l) => l.href)).toContain('/contact');
        expect(sitemapRoutes(false)).toEqual(expect.arrayContaining(['/contact', '/login-signup']));
    });

    it('uses the module default when no argument is given', async () => {
        vi.stubEnv('NEXT_PUBLIC_PUBLIC_ONLY', 'false');
        const links = await import('./siteLinks');
        expect(links.sitemapRoutes()).toContain('/contact');
        vi.resetModules();
        vi.stubEnv('NEXT_PUBLIC_PUBLIC_ONLY', 'true');
        const links2 = await import('./siteLinks');
        expect(links2.sitemapRoutes()).not.toContain('/contact');
    });
});
