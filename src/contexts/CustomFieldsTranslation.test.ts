import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CUSTOM_FIELD_TYPES, EDITABLE_BY, VISIBLE_TO } from '@/lib/customFields';

import CustomFieldsTranslation from './CustomFieldsTranslation';
import { translations } from './LanguageContext';

const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
const de = translations.de;

describe('CustomFieldsTranslation', () => {
    it('has identical key sets in German and English and no empty text', () => {
        expect(Object.keys(CustomFieldsTranslation.en).sort()).toEqual(Object.keys(CustomFieldsTranslation.de).sort());
        for (const [key, text] of Object.entries(CustomFieldsTranslation.de)) {
            expect(text.trim(), key).not.toBe('');
            expect(CustomFieldsTranslation.en[key]!.trim(), key).not.toBe('');
        }
    });

    it('uses the same {{placeholders}} in both languages and no single-brace ones', () => {
        for (const [key, text] of Object.entries(CustomFieldsTranslation.de)) {
            const en = CustomFieldsTranslation.en[key]!;
            expect(placeholders(en), key).toEqual(placeholders(text));
            for (const value of [text, en]) expect(/(?<!\{)\{\w+\}(?!\})/.test(value), `${key} has a single-brace placeholder`).toBe(false);
        }
    });

    it('does not shadow the keys of other translation modules', () => {
        for (const key of Object.keys(CustomFieldsTranslation.de)) expect(translations.de[key]).toBe(CustomFieldsTranslation.de[key]);
        for (const key of Object.keys(CustomFieldsTranslation.en)) expect(translations.en[key]).toBe(CustomFieldsTranslation.en[key]);
    });

    it('has every static key used by the custom field components', () => {
        const root = join(__dirname, '..');
        const files = [
            'components/verein/CustomFieldFormModal.tsx',
            'components/verein/CustomFieldsPanel.tsx',
            'components/verein/MemberCustomFields.tsx',
            'components/verein/MemberDetailDialog.tsx',
            'components/verein/MemberExportDialog.tsx',
            'components/verein/MemberList.tsx',
            'components/verein/ProfilTab.tsx',
            'lib/customFields.ts',
        ];
        const used = files.flatMap((f) => [...readFileSync(join(root, f), 'utf8').matchAll(/['"]((?:forms|verein)\.[\w.]+)['"]/g)].map((m) => m[1]!));
        expect(used.length).toBeGreaterThan(40);
        for (const key of used) expect(de[key], key).toBeTruthy();
    });

    it('has the dynamically built keys', () => {
        const need = (key: string) => expect(de[key], key).toBeTruthy();
        for (const type of CUSTOM_FIELD_TYPES) need(`forms.editor.type.${type}`);
        for (const v of VISIBLE_TO) {
            need(`forms.cf.visibleTo.${v}`);
            need(`forms.cf.visibleTo.${v}.hint`);
        }
        for (const e of EDITABLE_BY) {
            need(`forms.cf.editableBy.${e}`);
            need(`forms.cf.editableBy.${e}.hint`);
        }
        for (const p of ['label', 'label_text', 'key_format', 'key_reserved', 'key_duplicate', 'options_missing', 'option_label', 'option_duplicate', 'too_many_options']) need(`forms.cf.problem.${p}`);
        for (const v of ['type', 'sensitive', 'sensitive_permission', 'widening']) need(`forms.cf.violation.${v}`);
        need('verein.tab.zusatzfelder');
    });
});
