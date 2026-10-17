import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { expiryView } from '@/lib/credentials';

import ProfileModulesTranslation from './ProfileModulesTranslation';
import { translations } from './LanguageContext';

const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
const de = translations.de;

describe('ProfileModulesTranslation', () => {
    it('has identical key sets in German and English and no empty text', () => {
        expect(Object.keys(ProfileModulesTranslation.en).sort()).toEqual(Object.keys(ProfileModulesTranslation.de).sort());
        for (const [key, text] of Object.entries(ProfileModulesTranslation.de)) {
            expect(text.trim(), key).not.toBe('');
            expect(ProfileModulesTranslation.en[key]!.trim(), key).not.toBe('');
        }
    });

    it('uses the same {{placeholders}} in both languages and no single-brace ones', () => {
        for (const [key, text] of Object.entries(ProfileModulesTranslation.de)) {
            const en = ProfileModulesTranslation.en[key]!;
            expect(placeholders(en), key).toEqual(placeholders(text));
            for (const value of [text, en]) expect(/(?<!\{)\{\w+\}(?!\})/.test(value), `${key} has a single-brace placeholder`).toBe(false);
        }
    });

    it('does not shadow the keys of other translation modules', () => {
        for (const key of Object.keys(ProfileModulesTranslation.de)) expect(translations.de[key]).toBe(ProfileModulesTranslation.de[key]);
        for (const key of Object.keys(ProfileModulesTranslation.en)) expect(translations.en[key]).toBe(ProfileModulesTranslation.en[key]);
    });

    it('has every static key used by the profile module components', () => {
        const root = join(__dirname, '..');
        const files = ['components/verein/ExpiryBadge.tsx', 'components/forms/FormRenderer.tsx', 'components/verein/MemberCustomFields.tsx', 'components/verein/CustomFieldFormModal.tsx', 'lib/credentials.ts'];
        const used = files.flatMap((f) => [...readFileSync(join(root, f), 'utf8').matchAll(/['"]((?:forms|verein)\.[\w.]+)['"]/g)].map((m) => m[1]!));
        expect(used.length).toBeGreaterThan(15);
        for (const key of used) expect(de[key], key).toBeTruthy();
    });

    it('has a text for every expiry the helper can name, with the placeholders the helper passes', () => {
        const views = [
            expiryView({ status: 'missing', daysLeft: null, validUntil: null }),
            expiryView({ status: 'expired', daysLeft: -5, validUntil: '2026-01-01' }),
            expiryView({ status: 'expired', daysLeft: -1, validUntil: '2026-01-01' }),
            expiryView({ status: 'expiring', daysLeft: 0, validUntil: '2026-01-01' }),
            expiryView({ status: 'expiring', daysLeft: 1, validUntil: '2026-01-01' }),
            expiryView({ status: 'expiring', daysLeft: 30, validUntil: '2026-01-01' }),
            expiryView({ status: 'valid', daysLeft: 300, validUntil: '2026-01-01' }, '01.01.2026'),
            expiryView({ status: 'valid', daysLeft: null, validUntil: null }),
        ];
        for (const view of views) {
            expect(view).not.toBeNull();
            expect(de[view!.key], view!.key).toBeTruthy();
            expect(placeholders(de[view!.key]!), view!.key).toEqual(Object.keys(view!.params).sort());
        }
    });
});
