import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));

import { LanguageProvider } from '@/contexts/LanguageContext';
import type { DpaCurrent } from '@/lib/privacyAdmin';

import DpaBanner from './DpaBanner';

const base: DpaCurrent = {
    version: { id: 'v2', version: 2, title: 'AV-Vertrag', body: 'Text', subprocessors: [], tomAnnex: null, sha256: 's', requiredFrom: null, publishedAt: '2026-10-01' },
    status: { required: true, version: 2, accepted: false, acceptedAt: null, signerName: null, mandatoryFrom: null, deadline: '2026-11-01', daysLeft: 11, blocked: false },
    canAccept: true,
};

const render = (current: DpaCurrent | null) =>
    renderToStaticMarkup(
        <LanguageProvider initialLanguage="de">
            <DpaBanner current={current} onOpen={() => undefined} />
        </LanguageProvider>,
    );

describe('DpaBanner', () => {
    it('shows the grace period with the days left to the owner', () => {
        const html = render(base);
        expect(html).toContain('noch 11 Tag(e)');
        expect(html).toContain('Vertrag ansehen und annehmen');
        expect(html).not.toContain('Annehmen kann nur');
    });
    it('tells others that only the owner can accept', () => {
        const html = render({ ...base, canAccept: false });
        expect(html).toContain('Annehmen kann nur die Inhaberin oder der Inhaber');
        expect(html).toContain('Vertrag ansehen');
    });
    it('is an alert once writing is locked, and still says reading works', () => {
        const html = render({ ...base, status: { ...base.status, blocked: true, daysLeft: -2 } });
        expect(html).toContain('role="alert"');
        expect(html).toContain('Änderungen sind gesperrt');
    });
    it('renders nothing when accepted or without a version', () => {
        expect(render({ ...base, status: { ...base.status, accepted: true } })).toBe('');
        expect(render(null)).toBe('');
    });
});
