import { describe, expect, it } from 'vitest';

import AboutTranslation from './AboutTranslation';
import AssemblyTranslation from './AssemblyTranslation';
import ChangelogTranslation from './ChangelogTranslation';
import CommunicationTranslation from './CommunicationTranslation';
import FeaturesTranslation from './FeaturesTranslation';
import CustomFieldsTranslation from './CustomFieldsTranslation';
import FormBuilderTranslation from './FormBuilderTranslation';
import FormsTranslation from './FormsTranslation';
import KalenderTranslation from './KalenderTranslation';
import PrivacyTranslation from './PrivacyTranslation';
import ProfileModulesTranslation from './ProfileModulesTranslation';
import { translations } from './LanguageContext';
import MarketingHeroTranslation from './MarketingHeroTranslation';
import MarketingStoryTranslation from './MarketingStoryTranslation';
import MarketingTranslation from './MarketingTranslation';
import MarketingTrustTranslation from './MarketingTrustTranslation';
import RoadmapTranslation from './RoadmapTranslation';
import StandorteTranslation from './StandorteTranslation';
import TreffenTranslation from './TreffenTranslation';
import VereinTranslation from './VereinTranslation';
import VerfuegbarkeitTranslation from './VerfuegbarkeitTranslation';

// Modules that are DE/EN-only by design (documented in each file's header; other languages fall back to English
// per key via t()). Their keys are exempt from the "every language has every key" check.
const DE_EN_ONLY_KEYS = new Set(
  [AboutTranslation, AssemblyTranslation, ChangelogTranslation, CommunicationTranslation, CustomFieldsTranslation, FeaturesTranslation, FormBuilderTranslation, FormsTranslation, KalenderTranslation, MarketingHeroTranslation, MarketingStoryTranslation, MarketingTranslation, MarketingTrustTranslation, PrivacyTranslation, ProfileModulesTranslation, RoadmapTranslation, StandorteTranslation, TreffenTranslation, VereinTranslation, VerfuegbarkeitTranslation].flatMap(
    (m) => Object.keys(m.en ?? {}),
  ),
);

describe('LanguageContext translations (S2 fallback data)', () => {
  it('has every non-legal key for every supported language', () => {
    const enKeys = Object.keys(translations.en).sort();
    for (const lang of Object.keys(translations) as (keyof typeof translations)[]) {
      if (lang === 'de' || lang === 'en') continue;
      // legal.* keys are DE/EN-only by design (ADR-009) -- every other key
      // must exist so t() never needs to fall back for it.
      const nonLegalEnKeys = enKeys.filter((k) => !k.startsWith('legal.') && !DE_EN_ONLY_KEYS.has(k));
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

  it('resolves the shared common.* texts (used by LoadingText/LoadError on every page) in German and English', () => {
    for (const lang of ['de', 'en'] as const) {
      for (const key of ['common.loading', 'common.error', 'common.retry', 'common.close']) {
        expect(translations[lang][key], `${lang} ${key}`).toBeTruthy();
      }
    }
  });
});
