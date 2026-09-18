import { describe, expect, it } from 'vitest';

import { translations } from './LanguageContext';

describe('LanguageContext translations (S2 fallback data)', () => {
  it('has every non-legal key for every supported language', () => {
    const enKeys = Object.keys(translations.en).sort();
    for (const lang of Object.keys(translations) as (keyof typeof translations)[]) {
      if (lang === 'de' || lang === 'en') continue;
      // legal.* keys are DE/EN-only by design (ADR-009) -- every other key
      // must exist so t() never needs to fall back for it.
      const nonLegalEnKeys = enKeys.filter((k) => !k.startsWith('legal.'));
      const langKeys = new Set(Object.keys(translations[lang]));
      for (const key of nonLegalEnKeys) {
        expect(langKeys.has(key), `${lang} is missing key "${key}"`).toBe(true);
      }
    }
  });

  it('has no value for a DE/EN-only legal document key in a non-DE/EN language, so t() falls back to English', () => {
    // 'legal.privacy.title' comes from LegalTranslation.ts (DE/EN-only by
    // design, ADR-009) -- unlike 'legal.fallback-notice' (PageLayoutTranslation,
    // present in all 11 languages), this key must be missing outside de/en.
    const legalKey = 'legal.privacy.title';
    expect(translations.en[legalKey]).toBeTruthy();
    expect(translations.fr[legalKey]).toBeUndefined();
  });
});
