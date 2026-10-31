import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FIELD_ERROR_CODES } from '@/lib/formSchema';

import FormsTranslation from './FormsTranslation';
import { translations } from './LanguageContext';

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
        const files = ['lib/formSchema.ts', 'components/forms/FormRenderer.tsx', 'components/verein/ApplicationForm.tsx', 'components/verein/JoinClubCard.tsx', 'components/verein/ApplicationReviewDialog.tsx', 'components/verein/ApplicationsPanel.tsx', 'components/verein/ExitSection.tsx', 'components/verein/ExitQueuePanel.tsx', 'components/forms/AnswerList.tsx', 'lib/applicationReview.ts'];
        const used = files.flatMap((f) => [...readFileSync(join(root, f), 'utf8').matchAll(/'(forms\.[\w.]+)'/g)].map((m) => m[1]!));
        expect(used.length).toBeGreaterThan(20);
        for (const key of used) expect(translations.de[key], key).toBeTruthy();
    });

    it('has the dynamically built review keys (mapping reasons, targets, statuses, warnings)', () => {
        const reasons = ['not_answered', 'no_file', 'unknown_target', 'type_mismatch', 'not_a_text', 'invalid_value', 'custom_field_unknown', 'custom_field_archived', 'custom_field_type_mismatch', 'custom_field_not_sensitive', 'other'];
        for (const r of reasons) expect(FormsTranslation.de[`forms.review.mapping.reason.${r}`], r).toBeTruthy();
        const targets = ['firstName', 'lastName', 'birthDate', 'street', 'postalCode', 'city', 'phone', 'contactEmail', 'emergencyContactName', 'emergencyContactPhone', 'category', 'photo', 'custom'];
        for (const target of targets) expect(FormsTranslation.de[`forms.review.target.${target}`], target).toBeTruthy();
        for (const status of ['approved', 'rejected', 'withdrawn']) expect(FormsTranslation.de[`forms.review.status.${status}`], status).toBeTruthy();
        for (const w of ['child_is_adult', 'birth_date_missing', 'child_name_matches_guardian']) expect(FormsTranslation.de[`forms.review.warn.${w}`], w).toBeTruthy();
    });
});
