import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FIELD_ERROR_CODES } from '@/lib/formSchema';

import FormsTranslation from './FormsTranslation';

const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

describe('FormsTranslation', () => {
    it('has identical key sets in German and English', () => {
        expect(Object.keys(FormsTranslation.en).sort()).toEqual(Object.keys(FormsTranslation.de).sort());
    });

    it('uses the same {{placeholders}} in both languages and no empty text', () => {
        for (const [key, de] of Object.entries(FormsTranslation.de)) {
            const en = FormsTranslation.en[key]!;
            expect(de.trim(), key).not.toBe('');
            expect(en.trim(), key).not.toBe('');
            expect(placeholders(en), key).toEqual(placeholders(de));
        }
    });

    it('has a text for every field error code and child warning', () => {
        for (const code of FIELD_ERROR_CODES) expect(FormsTranslation.de[`forms.err.field.${code}`], code).toBeTruthy();
        for (const w of ['child_is_adult', 'birth_date_missing', 'child_name_matches_guardian']) expect(FormsTranslation.de[`forms.warn.${w}`], w).toBeTruthy();
    });

    it('has every static forms.* key used by the form helpers and components', () => {
        const root = join(__dirname, '..');
        const files = ['lib/formSchema.ts', 'components/forms/FormRenderer.tsx', 'components/verein/ApplicationForm.tsx', 'components/verein/JoinClubCard.tsx'];
        const used = files.flatMap((f) => [...readFileSync(join(root, f), 'utf8').matchAll(/'(forms\.[\w.]+)'/g)].map((m) => m[1]!));
        expect(used.length).toBeGreaterThan(20);
        for (const key of used) expect(FormsTranslation.de[key], key).toBeTruthy();
    });
});
