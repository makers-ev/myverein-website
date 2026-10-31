import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({ ApiError: class ApiError extends Error {}, apiFetch: vi.fn(() => new Promise(() => {})) }));
vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));

import { LanguageProvider } from '@/contexts/LanguageContext';
import type { OverviewField, OverviewRow } from '@/lib/credentialOverview';

import CredentialsPanel, { CredentialsTable } from './CredentialsPanel';

const wrap = (node: React.ReactNode, lang: 'de' | 'en' = 'de') => renderToStaticMarkup(<LanguageProvider initialLanguage={lang}>{node}</LanguageProvider>);

const fields: OverviewField[] = [{ id: 'f1', key: 'mod_q_uebungsleiter', label: 'Übungsleiter-Lizenz', sensitive: false, options: [{ value: 'b', label: 'B' }] }];
const row = (extra: Partial<OverviewRow> = {}): OverviewRow => ({
    clubMemberId: 'm1',
    displayName: 'Max Muster',
    firstName: 'Max',
    lastName: 'Muster',
    fieldKey: 'mod_q_uebungsleiter',
    fieldLabel: 'Übungsleiter-Lizenz',
    sensitive: false,
    value: { valid: true, level: 'b', validUntil: '2026-10-20' },
    updatedAt: null,
    expiry: { status: 'expiring', daysLeft: 3, validUntil: '2026-10-20' },
    enteredBy: 'self',
    ...extra,
});

describe('CredentialsPanel', () => {
    it('starts with the explanation, the filters and a loading state; "nicht eingetragen" is disabled until a qualification is chosen', () => {
        const html = wrap(<CredentialsPanel clubId="c1" canIncludeFormer={false} />);
        expect(html).toContain('Wer hat welche Qualifikation');
        expect(html).toContain('keine Erinnerungen');
        expect(html).toContain('for="cred-field"');
        expect(html).toContain('for="cred-status"');
        expect(html).toContain('for="cred-within"');
        expect(html).toMatch(/<option value="missing" disabled="">Nicht eingetragen<\/option>/);
        expect(html).toContain('Für „Nicht eingetragen“ wähle zuerst eine Qualifikation.');
        for (const days of [30, 90, 180]) expect(html).toContain(`in den nächsten ${days} Tagen`);
        expect(html).not.toContain('Ehemalige Mitglieder');
        expect(html).not.toContain('<table');
    });

    it('offers former members only to those who may use the option', () => {
        expect(wrap(<CredentialsPanel clubId="c1" canIncludeFormer />)).toContain('Ehemalige Mitglieder einbeziehen');
    });
});

describe('CredentialsTable', () => {
    const render = (rows: OverviewRow[], loading = false, lang: 'de' | 'en' = 'de') => wrap(<CredentialsTable rows={rows} fields={fields} loading={loading} onOpen={() => {}} />, lang);

    it('lists name, qualification, level label, date, status in words and a named details button', () => {
        const html = render([row()]);
        expect(html).toContain('relative overflow-x-auto');
        expect(html).toContain('<caption class="sr-only">Qualifikationen</caption>');
        expect(html).toContain('scope="col"');
        expect(html).toContain('scope="row"');
        expect(html).toContain('Max Muster');
        expect(html).toContain('Übungsleiter-Lizenz');
        expect(html).toContain('>B<');
        expect(html).toContain('20.10.2026');
        expect(html).toContain('Läuft ab in 3 Tagen');
        expect(html).toContain('Details von Max Muster anzeigen');
        expect(html).toContain('Selbst angegeben');
    });

    it('marks confidential rows and shows missing and expired ones in words', () => {
        const html = render([
            row({ sensitive: true, enteredBy: 'board' }),
            row({ clubMemberId: 'm2', displayName: null, firstName: null, lastName: null, value: null, expiry: { status: 'missing', daysLeft: null, validUntil: null }, enteredBy: null }),
            row({ clubMemberId: 'm3', expiry: { status: 'expired', daysLeft: -12, validUntil: '2026-10-05' } }),
        ]);
        expect(html).toContain('vertraulich');
        expect(html).toContain('Vom Vorstand eingetragen');
        expect(html).toContain('Nicht eingetragen');
        expect(html).toContain('Abgelaufen seit 12 Tagen');
        expect(html).toContain('Details von — anzeigen');
        expect(render([row({ enteredBy: 'guardian' })])).toContain('Von Erziehungsberechtigten eingetragen');
        expect(render([row({ enteredBy: 'guardian' })], false, 'en')).toContain('Entered by a guardian');
    });

    it('renders text as plain text and dims while loading', () => {
        const html = render([row({ displayName: '<img src=x onerror=1>', fieldLabel: '<script>1</script>' })], true);
        expect(html).not.toMatch(/<img src=x/);
        expect(html).not.toMatch(/<script/);
        expect(html).toContain('opacity-60');
        expect(html).toContain('aria-busy="true"');
    });

    it('shows the localized label of a field when the definitions delivered one', () => {
        const html = wrap(<CredentialsTable rows={[row()]} fields={fields} labels={{ mod_q_uebungsleiter: 'Instructor licence' }} loading={false} onOpen={() => {}} />, 'en');
        expect(html).toContain('Instructor licence');
        expect(html).not.toContain('Übungsleiter-Lizenz');
    });

    it('renders in English', () => {
        const html = render([row()], false, 'en');
        expect(html).toContain('Expires in 3 days');
        expect(html).toContain('Show details of Max Muster');
    });
});
