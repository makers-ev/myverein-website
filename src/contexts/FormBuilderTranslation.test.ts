import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { KNOWN_PROBLEM_CODES, MAPPING_TARGET_KEYS, PATTERN_OPTIONS } from '@/lib/formEditor';
import { FIELD_TYPES } from '@/lib/formSchema';

import FormBuilderTranslation from './FormBuilderTranslation';
import { translations } from './LanguageContext';

const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
const de = translations.de;

describe('FormBuilderTranslation', () => {
    it('has identical key sets in German and English and no empty text', () => {
        expect(Object.keys(FormBuilderTranslation.en).sort()).toEqual(Object.keys(FormBuilderTranslation.de).sort());
        for (const [key, text] of Object.entries(FormBuilderTranslation.de)) {
            expect(text.trim(), key).not.toBe('');
            expect(FormBuilderTranslation.en[key]!.trim(), key).not.toBe('');
        }
    });

    it('uses the same {{placeholders}} in both languages and no single-brace ones', () => {
        for (const [key, text] of Object.entries(FormBuilderTranslation.de)) {
            const en = FormBuilderTranslation.en[key]!;
            expect(placeholders(en), key).toEqual(placeholders(text));
            for (const value of [text, en]) expect(/(?<!\{)\{\w+\}(?!\})/.test(value), `${key} has a single-brace placeholder`).toBe(false);
        }
    });

    it('does not shadow the keys of other translation modules', () => {
        for (const key of Object.keys(FormBuilderTranslation.de)) expect(translations.de[key]).toBe(FormBuilderTranslation.de[key]);
        for (const key of Object.keys(FormBuilderTranslation.en)) expect(translations.en[key]).toBe(FormBuilderTranslation.en[key]);
    });

    it('has every static key used by the editor components', () => {
        const root = join(__dirname, '..');
        const files = [
            'components/verein/FieldEditModal.tsx',
            'components/verein/FormEditor.tsx',
            'components/verein/FormConflictDialog.tsx',
            'components/useConfirm.tsx',
            'components/verein/FormPublishDialog.tsx',
            'components/verein/FormVersionsDialog.tsx',
            'components/verein/FormsPanel.tsx',
            'components/verein/CategoriesPanel.tsx',
            'components/forms/OptionsEditor.tsx',
            'lib/formEditor.ts',
        ];
        const used = files.flatMap((f) => [...readFileSync(join(root, f), 'utf8').matchAll(/['"]((?:forms|verein)\.[\w.]+)['"]/g)].map((m) => m[1]!));
        expect(used.length).toBeGreaterThan(100);
        for (const key of used) expect(de[key], key).toBeTruthy();
    });

    it('has the dynamically built keys', () => {
        const need = (key: string) => expect(de[key], key).toBeTruthy();
        for (const type of FIELD_TYPES) {
            need(`forms.editor.type.${type}`);
            need(`forms.editor.typeHelp.${type}`);
        }
        for (const p of PATTERN_OPTIONS) need(`forms.editor.field.pattern.${p}`);
        for (const op of ['eq', 'neq', 'in', 'checked']) need(`forms.editor.field.condition.op.${op}`);
        for (const status of ['draft', 'published', 'archived']) need(`forms.editor.version.status.${status}`);
        for (const purpose of ['aufnahme', 'austritt']) need(`forms.editor.purpose.${purpose}`);
        for (const target of MAPPING_TARGET_KEYS) need(`forms.review.target.${target}`);
        need('verein.tab.formulare');
    });

    it('has a plain-language text for every problem code the editor and the server know', () => {
        for (const code of [...KNOWN_PROBLEM_CODES, 'other']) expect(de[`forms.editor.problem.${code}`], code).toBeTruthy();
    });
});
