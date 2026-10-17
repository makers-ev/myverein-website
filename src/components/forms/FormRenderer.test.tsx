import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({ ApiError: class ApiError extends Error {}, apiFetch: vi.fn() }));
vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));

import { LanguageProvider } from '@/contexts/LanguageContext';
import type { FormField } from '@/lib/formSchema';

import FormRenderer from './FormRenderer';

const render = (props: Partial<React.ComponentProps<typeof FormRenderer>> & { fields: FormField[] }) =>
    renderToStaticMarkup(
        <LanguageProvider initialLanguage="de">
            <FormRenderer answers={{}} onChange={() => {}} idPrefix="t" {...props} />
        </LanguageProvider>,
    );

describe('FormRenderer', () => {
    it('renders text of the definition as plain text, never as HTML', () => {
        const html = render({
            fields: [
                { key: 'name_field', type: 'text', label: '<img src=x onerror=alert(1)>', helpText: '<script>alert(2)</script>', required: true },
                { key: 'sel', type: 'select', label: 'S', options: [{ value: 'a', label: '<b>fett</b>' }] },
                { key: 'info_x', type: 'info', label: 'Info', text: '<iframe src=//evil></iframe>' },
            ],
            privacyNotice: '<svg onload=alert(3)>',
        });
        expect(html).not.toMatch(/<img src=x/);
        expect(html).not.toMatch(/<script/);
        expect(html).not.toMatch(/<iframe/);
        expect(html).not.toContain('<svg onload');
        expect(html).not.toMatch(/<b>fett/);
        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
        expect(html).toContain('&lt;svg onload=alert(3)&gt;');
    });

    it('wires labels, required markers, help text and errors for assistive technology', () => {
        const html = render({
            fields: [{ key: 'name_field', type: 'text', label: 'Name', helpText: 'Wie im Ausweis', required: true }],
            errors: { name_field: 'required' },
        });
        expect(html).toContain('for="t-name_field"');
        expect(html).toContain('id="t-name_field"');
        expect(html).toContain('aria-describedby="t-name_field-help t-name_field-err"');
        expect(html).toContain('aria-invalid="true"');
        expect(html).toContain('aria-required="true"');
        expect(html).toContain('Pflichtfeld');
        expect(html).toContain('Bitte fülle dieses Feld aus.');
    });

    it('hides conditional fields until their condition holds', () => {
        const fields: FormField[] = [
            { key: 'child', type: 'checkbox', label: 'Kind' },
            { key: 'parent', type: 'text', label: 'Elternname', visibleIf: { fieldKey: 'child', op: 'checked' } },
        ];
        expect(render({ fields })).not.toContain('Elternname');
        expect(render({ fields, answers: { child: true } })).toContain('Elternname');
    });

    it('shows the privacy notice right above the first consent, once', () => {
        const html = render({
            fields: [
                { key: 'name_field', type: 'text', label: 'Name' },
                { key: 'agree', type: 'consent', label: 'Ich stimme zu', required: true },
            ],
            privacyNotice: 'Wir speichern deine Daten.',
        });
        expect(html.match(/Wir speichern deine Daten\./g)).toHaveLength(1);
        expect(html.indexOf('Wir speichern')).toBeLessThan(html.indexOf('Ich stimme zu'));
        expect(html.indexOf('Wir speichern')).toBeGreaterThan(html.indexOf('Name'));
    });

    it('shows the notice at the end when the form has no consent, and via an info block without text', () => {
        const noConsent = render({ fields: [{ key: 'name_field', type: 'text', label: 'Name' }], privacyNotice: 'Hinweis' });
        expect(noConsent.indexOf('Hinweis')).toBeGreaterThan(noConsent.indexOf('Name'));
        const viaInfo = render({
            fields: [
                { key: 'priv', type: 'info', label: 'Datenschutz', infoKind: 'privacy_notice' },
                { key: 'agree', type: 'consent', label: 'ok' },
            ],
            privacyNotice: 'Hinweis',
        });
        expect(viaInfo.match(/Hinweis/g)).toHaveLength(1);
    });

    it('does not offer uploads without an upload handler', () => {
        const html = render({ fields: [{ key: 'doc', type: 'file', label: 'Nachweis' }] });
        expect(html).toContain('Dateien können hier nicht hochgeladen werden.');
        expect(html).not.toContain('type="file"');
    });

    it('offers a file picker restricted to PDF/JPEG/PNG and lists uploaded files', () => {
        const html = render({
            fields: [{ key: 'doc', type: 'file', label: 'Nachweis' }],
            onUploadFile: async () => {},
            onRemoveFile: async () => {},
            files: [{ id: 'f1', fieldKey: 'doc', filename: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 2048, kind: 'document', url: null }],
        });
        expect(html).toContain('accept="application/pdf,image/jpeg,image/png"');
        expect(html).toContain('a.pdf');
        expect(html).toContain('Datei a.pdf entfernen');
    });

    it('places the notice above the first VISIBLE consent when an earlier consent is hidden', () => {
        const fields: FormField[] = [
            { key: 'kid', type: 'checkbox', label: 'Kind' },
            { key: 'agree_kid', type: 'consent', label: 'Zustimmung Kind', visibleIf: { fieldKey: 'kid', op: 'checked' } },
            { key: 'name_field', type: 'text', label: 'Name' },
            { key: 'agree', type: 'consent', label: 'Zustimmung allgemein' },
        ];
        const html = render({ fields, privacyNotice: 'Hinweistext' });
        expect(html.match(/Hinweistext/g)).toHaveLength(1);
        expect(html.indexOf('Hinweistext')).toBeGreaterThan(html.indexOf('Name'));
        expect(html.indexOf('Hinweistext')).toBeLessThan(html.indexOf('Zustimmung allgemein'));
    });

    it('marks errors for assistive technology with role=alert', () => {
        const html = render({ fields: [{ key: 'agree', type: 'consent', label: 'Ok', required: true }], errors: { agree: 'required' } });
        expect(html).toContain('role="alert"');
    });

    describe('credential field (qualification with validity)', () => {
        const levels: FormField = { key: 'lizenz', type: 'credential', label: 'Übungsleiter-Lizenz', helpText: 'Nur ankreuzen, wenn vorhanden.', options: [{ value: 'c', label: 'C' }, { value: 'b', label: 'B' }] };
        const free: FormField = { key: 'lizenz', type: 'credential', label: 'Lizenz', validation: { maxLength: 60 } };
        const plain: FormField = { key: 'lizenz', type: 'credential', label: 'JuLeiCa' };

        it('shows only the "habe ich" checkbox and the help text until it is checked', () => {
            const html = render({ fields: [levels] });
            expect(html).toContain('Habe ich');
            expect(html).toContain('Übungsleiter-Lizenz');
            expect(html).toContain('Nur ankreuzen, wenn vorhanden.');
            expect(html).toContain('aria-describedby="t-lizenz-help"');
            expect(html).not.toContain('Gültig bis');
            expect(html).not.toContain('<select');
            expect(html).not.toMatch(/type="checkbox"[^>]*checked/);
        });

        it('offers the level as a select from the options once checked, plus both dates', () => {
            const html = render({ fields: [levels], answers: { lizenz: { valid: true, level: 'b', validUntil: '2099-01-31' } } });
            expect(html).toMatch(/type="checkbox"[^>]*checked/);
            expect(html).toContain('Stufe');
            expect(html).toContain('<option value="b" selected="">B</option>');
            expect(html).toContain('Erworben / vorgelegt am');
            expect(html).toContain('Gültig bis');
            expect(html.match(/type="date"/g)).toHaveLength(2);
            expect(html).toContain('value="2099-01-31"');
        });

        it('offers a limited text input for a free-text level and no level input without either', () => {
            const text = render({ fields: [free], answers: { lizenz: { valid: true } } });
            expect(text).toContain('maxLength="60"');
            expect(text).toContain('Stufe');
            const none = render({ fields: [plain], answers: { lizenz: { valid: true } } });
            expect(none).not.toContain('Stufe');
            expect(none).toContain('Gültig bis');
        });

        it('shows the status in words, with an icon that is hidden from assistive technology', () => {
            const expired = render({ fields: [plain], answers: { lizenz: { valid: true, validUntil: '2000-01-01' } } });
            expect(expired).toContain('Abgelaufen seit');
            expect(expired).toContain('data-expiry="expired"');
            expect(expired).toContain('aria-hidden="true"');
            const later = render({ fields: [plain], answers: { lizenz: { valid: true, validUntil: '2099-01-01' } } });
            expect(later).toContain('data-expiry="valid"');
            expect(later).toContain('Gültig bis 1.1.2099');
            expect(render({ fields: [plain], answers: { lizenz: { valid: true } } })).toContain('Ohne Ablaufdatum');
        });

        it('explains "gültig bis" before "erworben am" locally and does not show a status then', () => {
            const html = render({ fields: [plain], answers: { lizenz: { valid: true, obtainedOn: '2024-05-02', validUntil: '2024-05-01' } }, errors: { lizenz: 'invalid_value' } });
            expect(html).toContain('darf nicht vor');
            expect(html).toContain('role="alert"');
            expect(html).toContain('aria-invalid="true"');
            expect(html).not.toContain('data-expiry');
            expect(html).not.toContain('Dieser Wert ist ungültig');
        });

        it('shows a server error code of the value', () => {
            const html = render({ fields: [levels], answers: { lizenz: { valid: true, level: 'x' } }, errors: { lizenz: 'not_an_option' } });
            expect(html).toContain('role="alert"');
        });

        it('renders texts of the definition as plain text', () => {
            const html = render({ fields: [{ ...levels, label: '<img src=x onerror=1>', helpText: '<script>1</script>', options: [{ value: 'c', label: '<b>C</b>' }] }], answers: { lizenz: { valid: true } } });
            expect(html).not.toMatch(/<img src=x/);
            expect(html).not.toMatch(/<script/);
            expect(html).not.toMatch(/<b>C/);
        });

        it('renders in English', () => {
            const html = renderToStaticMarkup(
                <LanguageProvider initialLanguage="en">
                    <FormRenderer fields={[plain]} answers={{ lizenz: { valid: true } }} onChange={() => {}} idPrefix="t" />
                </LanguageProvider>,
            );
            expect(html).toContain('I have this');
            expect(html).toContain('Valid until');
        });
    });
});
