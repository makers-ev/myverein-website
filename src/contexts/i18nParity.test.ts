import { describe, expect, it } from 'vitest';

import { translations } from './LanguageContext';

/**
 * DS3: German and English are the complete languages (every key, same `{{placeholders}}`). The other languages fall back to
 * English per key on purpose (ADR-009, see README "Internationalisation"); they are covered by LanguageContext.test.ts for the
 * modules that ship all languages. Run on its own with `npm run check:i18n`.
 */
const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]!).sort();

describe('i18n parity DE/EN', () => {
    const de = translations.de;
    const en = translations.en;

    it('has the same keys in German and English', () => {
        const missingInEn = Object.keys(de).filter((k) => !(k in en));
        const missingInDe = Object.keys(en).filter((k) => !(k in de));
        expect({ missingInEn, missingInDe }).toEqual({ missingInEn: [], missingInDe: [] });
    });

    it('has no empty texts', () => {
        const empty = (['de', 'en'] as const).flatMap((l) => Object.entries(translations[l]).filter(([, v]) => v.trim() === '').map(([k]) => `${l}:${k}`));
        expect(empty).toEqual([]);
    });

    it('uses the same placeholders in both languages', () => {
        const mismatched = Object.keys(de)
            .filter((k) => k in en && placeholders(de[k]!).join() !== placeholders(en[k]!).join())
            .map((k) => k);
        expect(mismatched).toEqual([]);
    });
});
