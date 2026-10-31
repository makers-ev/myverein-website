import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined }) }));

import { LanguageProvider } from '@/contexts/LanguageContext';

import PrivacyPanel from './PrivacyPanel';

const render = (permissions: string[]) =>
    renderToStaticMarkup(
        <LanguageProvider initialLanguage="de">
            <PrivacyPanel clubId="c1" permissions={permissions} />
        </LanguageProvider>,
    );

describe('PrivacyPanel gating', () => {
    it('shows nothing without a privacy permission (deny by default)', () => {
        expect(render([])).toBe('');
        expect(render(['members:write', 'announcements:write'])).toBe('');
    });
    it('offers every area to people with privacy:read', () => {
        const html = render(['privacy:read']);
        for (const label of ['Einwilligungen', 'Datenschutzhinweis', 'Anfragen', 'Aufbewahrung', 'Einstellungen', 'AV-Vertrag', 'Zugriffsprotokoll']) expect(html).toContain(label);
    });
    it('hides the access log from people who may only manage', () => {
        const html = render(['privacy:manage']);
        expect(html).toContain('Datenschutzhinweis');
        expect(html).not.toContain('Zugriffsprotokoll');
    });
});
