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
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" strokeWidth={2.25} />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground">{t(`${keyPrefix}.title`)}</h1>
      </div>

      {showLanguageFallback && (
        <p className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {t('legal.fallback-notice')}
        </p>
      )}

      <p className="mb-6 text-xs italic text-muted-foreground">{t(`${keyPrefix}.placeholder-notice`)}</p>

      {Array.from({ length: sectionCount }, (_, i) => i + 1).map((num) => (
        <div key={num} className="mb-5">
          <h2 className="mb-1 text-base font-bold text-foreground">{t(`${keyPrefix}.section${num}.title`)}</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{t(`${keyPrefix}.section${num}.text`)}</p>
        </div>
      ))}
    </div>
  );
}
