'use client';

import { Building2, ScrollText, ShieldCheck } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';

// Icons can't cross the Server -> Client Component boundary as a prop, so they're picked here off `keyPrefix` instead of passed in from page.tsx.
const ICONS = {
  'legal.privacy': ShieldCheck,
  'legal.tos': ScrollText,
  'legal.imprint': Building2,
} as const;

/** Shared shell for the legal pages -- title/notice/numbered-sections, same layout for Privacy/Terms/Imprint. */
export function LegalDocument({ keyPrefix, sectionCount }: { keyPrefix: keyof typeof ICONS; sectionCount: number }) {
  const { t, language } = useLanguage();
  const Icon = ICONS[keyPrefix];
  // Legal copy stays DE/EN-only (ADR-009) -- t()'s English fallback already
  // renders the right text for every other language, this banner just makes
  // that fallback visible instead of silent.
  const showLanguageFallback = language !== 'de' && language !== 'en';

  return (
    <div className="mx-auto max-w-[44rem] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <header className="mb-10 border-b border-border pb-8">
        <Icon className="mb-5 h-6 w-6 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
        <h1 className="font-display text-4xl leading-[1.1] text-foreground sm:text-5xl">{t(`${keyPrefix}.title`)}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{t(`${keyPrefix}.updated`)}</p>
      </header>

      {showLanguageFallback && (
        <p className="mb-8 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
          {t('legal.fallback-notice')}
        </p>
      )}

      {Array.from({ length: sectionCount }, (_, i) => i + 1).map((num) => (
        <section key={num} className="mb-8">
          <h2 className="mb-2 text-lg font-semibold leading-snug text-foreground">{t(`${keyPrefix}.section${num}.title`)}</h2>
          <p className="whitespace-pre-line text-[0.9375rem] leading-7 text-foreground">{t(`${keyPrefix}.section${num}.text`)}</p>
        </section>
      ))}
    </div>
  );
}
