import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({ ApiError: class ApiError extends Error {}, apiFetch: vi.fn() }));
vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));

import { LanguageProvider, translations } from '@/contexts/LanguageContext';
import type { MySubmission } from '@/lib/formSchema';

import { DecidedItem } from './JoinClubCard';

const base: MySubmission = {
    id: 's1',
    formVersionId: 'v1',
    onBehalfOf: 'self',
    status: 'rejected',
    answers: {},
    files: [],
    submittedAt: '2026-05-01T08:00:00.000Z',
    decidedAt: '2026-05-17T22:30:00.000Z',
    decisionNote: '<img src=x onerror=alert(1)> Bitte melde dich beim Vorstand.',
    createdAt: '2026-04-30T08:00:00.000Z',
    purpose: 'aufnahme',
    version: 1,
    club: { id: 'c', name: 'Demo', slug: 'demo' },
};

const t = (key: string, params?: Record<string, string | number>) => (translations.de[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(params?.[k] ?? ''));
const render = (s: Partial<MySubmission>) =>
    renderToStaticMarkup(
        <LanguageProvider initialLanguage="de">
            <ul>
                <DecidedItem submission={{ ...base, ...s }} language="de" t={t} onRefresh={() => {}} />
            </ul>
        </LanguageProvider>,
    );

describe('DecidedItem', () => {
    it('shows the board message of a rejection as escaped text with the Berlin date', () => {
        const html = render({});
        expect(html).toContain('Nachricht des Vereins');
        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; Bitte melde dich beim Vorstand.');
        expect(html).not.toContain('<img');
        // 22:30 UTC on 17 May is already 18 May in Berlin.
        expect(html).toContain('18.5.2026');
        expect(html).toContain('Abgelehnt');
    });
    it('says so when the club left no message', () => {
        expect(render({ decisionNote: null })).toContain('Der Verein hat keine Nachricht hinterlassen.');
    });
    it('points an accepted application to reloading and never shows a message', () => {
        const html = render({ status: 'accepted' });
        expect(html).toContain('Angenommen');
        expect(html).toContain('Dein Antrag wurde angenommen');
        expect(html).not.toContain('Nachricht des Vereins');
    });
    it('shows a withdrawn application without a message', () => {
        const html = render({ status: 'withdrawn' });
        expect(html).toContain('Zurückgezogen');
        expect(html).not.toContain('Nachricht des Vereins');
        expect(html).not.toContain('onerror');
    });
});
