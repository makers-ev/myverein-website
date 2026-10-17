import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({ ApiError: class ApiError extends Error {}, apiFetch: vi.fn(() => new Promise(() => {})) }));
vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }) }));

import { LanguageProvider, translations } from '@/contexts/LanguageContext';

import ProfilTab, { type OwnMembership } from './ProfilTab';

const base: OwnMembership = {
    id: 'm1',
    name: 'Max Muster',
    email: 'max@example.com',
    category: null,
    joinedAt: '2020-01-01',
    roles: [],
    permissions: [],
};

const render = (me: OwnMembership, lang: 'de' | 'en' = 'de') =>
    renderToStaticMarkup(
        <LanguageProvider initialLanguage={lang}>
            <ProfilTab me={me} clubId="c1" onSaved={() => {}} />
        </LanguageProvider>,
    );

describe('ProfilTab', () => {
    it('shows all sections with autocomplete attributes when the backend delivers the values', () => {
        const html = render({ ...base, firstName: 'Max', lastName: 'Muster', contactEmail: null, phone: null, street: null, postalCode: null, city: null, birthDate: null, emergencyContactName: null, emergencyContactPhone: null });
        for (const text of ['Name', 'Kontakt', 'Anschrift', 'Geburtsdatum', 'Notfallkontakt', 'Anzeigename', 'Vorname', 'Nachname']) expect(html).toContain(text);
        for (const ac of ['given-name', 'family-name', 'tel', 'street-address', 'postal-code', 'address-level2', 'email']) expect(html).toContain(`autoComplete="${ac}"`);
        expect(html).toContain('href="/settings"');
        expect(html).toContain('<button type="submit" disabled=""');
    });

    it('hides sensitive sections the backend did not deliver and does not break on missing name parts', () => {
        const html = render(base);
        expect(html).not.toContain('Anschrift');
        expect(html).not.toContain('Notfallkontakt');
        expect(html).not.toContain('Kontakt-E-Mail');
        expect(html).toContain('Anzeigename');
    });

    it('shows the neutral minor hint only for a known birth date under 18', () => {
        const year = new Date().getFullYear() - 10;
        expect(render({ ...base, birthDate: `${year}-01-01` })).toContain('unter 18');
        expect(render({ ...base, birthDate: '1990-01-01' })).not.toContain('unter 18');
        expect(render(base)).not.toContain('unter 18');
    });

    it('renders in English', () => {
        expect(render({ ...base, street: null }, 'en')).toContain('Display name');
    });
});

describe('profile translations', () => {
    const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
    it('has identical keys and placeholders in DE and EN', () => {
        const keys = (lang: 'de' | 'en') => Object.keys(translations[lang]).filter((k) => k.startsWith('verein.profil.'));
        expect(keys('en').sort()).toEqual(keys('de').sort());
        for (const k of keys('de')) {
            expect(placeholders(translations.en[k]!), k).toEqual(placeholders(translations.de[k]!));
            expect(/(?<!\{)\{\w+\}(?!\})/.test(translations.de[k]! + translations.en[k]!), k).toBe(false);
        }
    });
});
