import { createElement, type ComponentType, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: unknown }) => createElement('a', { href, ...rest }, children as never) }));

import { LanguageProvider } from '@/contexts/LanguageContext';
import type { SearchViewState } from '@/lib/clubSearch';

import ClubSearchResults from './ClubSearchResults';

const Provider = LanguageProvider as ComponentType<{ initialLanguage: string; children?: ReactNode }>;

function html(state: SearchViewState, language: 'de' | 'en' = 'de'): string {
    return renderToStaticMarkup(createElement(Provider, { initialLanguage: language }, createElement(ClubSearchResults, { state, onRetry: () => {} })));
}

const hit = (n: number, extra: Record<string, unknown> = {}) => ({ slug: `club-${n}`, name: `Verein ${n}`, city: n % 2 ? 'Hamburg' : null, logoUrl: null, ...extra });

describe('ClubSearchResults', () => {
    it('shows tips at the start and says nothing in the live region', () => {
        const out = html({ kind: 'idle' });
        expect(out).toContain('So findest du deinen Verein');
        expect(out).toMatch(/aria-live="polite"[^>]*class="sr-only"><\/p>/);
    });

    it('shows skeletons while loading and announces it', () => {
        const out = html({ kind: 'loading' });
        expect(out).toContain('animate-skeleton');
        expect(out).toContain('Suche läuft');
    });

    it('lists hits with page link, join action and a live result count', () => {
        const out = html({ kind: 'ok', hits: [hit(1), hit(2)] });
        expect(out).toContain('2 Vereine gefunden');
        expect(out).toContain('href="/v/club-1"');
        expect(out).toContain('Vereinsseite ansehen: Verein 1');
        expect(out).toContain('Bei Verein 2 beitreten');
        expect(out).toContain('Hamburg');
        expect(out).toContain('>V1<'); // initials fallback without a logo
    });

    it('uses the logo exactly as delivered', () => {
        const out = html({ kind: 'ok', hits: [hit(1, { logoUrl: 'https://media.example/logo.png' })] });
        expect(out).toContain('src="https://media.example/logo.png"');
        expect(out).toContain('Ein Verein gefunden');
    });

    it('hints at narrowing the search when the backend limit is reached', () => {
        const out = html({ kind: 'ok', hits: Array.from({ length: 10 }, (_, i) => hit(i)) });
        expect(out).toContain('höchstens 10 Treffer');
    });

    it('answers "no hit" neutrally, without saying whether a club exists', () => {
        const out = html({ kind: 'ok', hits: [] });
        expect(out).toContain('Keine passenden Vereine gefunden');
        expect(out).toContain('Vereinskürzel');
        expect(out).not.toMatch(/nicht gelistet|versteckt|existiert|nicht auffindbar/i);
    });

    it('shows an alert with a retry button on errors, with its own text for 429', () => {
        const err = html({ kind: 'error', rateLimited: false });
        expect(err).toContain('role="alert"');
        expect(err).toContain('Erneut versuchen');
        expect(err).toContain('Bitte versuche es gleich noch einmal');
        expect(html({ kind: 'error', rateLimited: true })).toContain('sehr viele Suchanfragen');
    });

    it('renders in English too', () => {
        expect(html({ kind: 'ok', hits: [hit(1), hit(2)] }, 'en')).toContain('2 clubs found');
    });
});
