import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({ ApiError: class ApiError extends Error {}, apiFetch: vi.fn() }));
vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));

import { LanguageProvider } from '@/contexts/LanguageContext';
import { FIELD_TYPES, type FormField } from '@/lib/formSchema';

import FieldEditModal from './FieldEditModal';

const base: FormField[] = [
    { key: 'art', type: 'select', label: 'Art', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
    { key: 'vorname', type: 'text', label: 'Vorname', required: true },
    { key: 'ort', type: 'text', label: '<b>Wohnadresse</b>', visibleIf: { fieldKey: 'art', op: 'eq', value: 'a' } },
];

const render = (props: Partial<React.ComponentProps<typeof FieldEditModal>> = {}) =>
    renderToStaticMarkup(
        <LanguageProvider initialLanguage="de">
            <FieldEditModal
                field={null}
                index={base.length}
                fields={base}
                publishedFields={[]}
                purpose="aufnahme"
                customFields={[{ key: 'trikot', label: 'Trikotgröße', type: 'text', sensitive: false, archived: false }]}
                customFieldsFailed={false}
                categories={[{ key: 'aktiv', name: 'Aktiv' }]}
                onSave={() => {}}
                onClose={() => {}}
                {...props}
            />
        </LanguageProvider>,
    );

describe('FieldEditModal', () => {
    it('renders a new field with the type list and the mapping and condition sections for the application form', () => {
        const html = render();
        expect(html).toContain('Feld hinzufügen');
        for (const type of FIELD_TYPES) expect(html).toContain(`value="${type}"`);
        expect(html).toContain('Speichern als');
        expect(html).toContain('Nur anzeigen, wenn …');
        expect(html).toContain('Trikotgröße');
        expect(html).not.toMatch(/<button(?![^>]*type="button")[^>]*>/);
    });

    it('offers no mapping and no upload types in the exit form', () => {
        const html = render({ purpose: 'austritt' });
        expect(html).not.toContain('Speichern als');
        expect(html).not.toContain('value="file"');
        expect(html).not.toContain('value="image"');
        expect(html).toContain('value="textarea"');
    });

    it('locks key and type of a field that is part of the published version and shows its condition builder', () => {
        const field = base[2]!;
        const html = render({ field, index: 2, publishedFields: [field] });
        expect(html).toMatch(/<select[^>]*disabled=""[^>]*>/);
        expect(html).toMatch(/<input[^>]*readOnly=""[^>]*value="ort"|<input[^>]*value="ort"[^>]*readOnly=""/);
        expect(html).toContain('Frühere Antwort');
        // The label is plain text in the input value, not interpreted.
        expect(html).not.toContain('<b>Wohnadresse</b>');
    });

    it('lists only earlier fields as condition sources', () => {
        const field: FormField = { ...base[1]!, visibleIf: { fieldKey: 'art', op: 'eq', value: 'a' } };
        const html = render({ field, index: 1, fields: [base[0]!, field, base[2]!] });
        const from = html.indexOf('Frühere Antwort');
        const sources = html.slice(from, html.indexOf('Vergleich', from));
        expect(sources).toContain('>Art<');
        expect(sources).not.toContain('Wohnadresse');
        expect(sources).not.toContain('>Vorname<');
        // The first field has nothing before it.
        expect(render({ field: base[0]!, index: 0 })).toContain('Bedingungen sind erst möglich');
    });

    it('shows the options editor for a choice and the number limits for a number', () => {
        expect(render({ field: base[0]!, index: 0 })).toContain('Option hinzufügen');
        const number = render({ field: { key: 'zahl', type: 'number', label: 'Zahl' }, index: 3, fields: [...base, { key: 'zahl', type: 'number', label: 'Zahl' }] });
        expect(number).toContain('Kleinster Wert');
        expect(number).not.toContain('Format prüfen');
    });
});
