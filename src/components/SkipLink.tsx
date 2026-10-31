'use client';

import { useLanguage } from '@/contexts/LanguageContext';

/** First focusable element of every page: jumps over the navbar to `<main id="main-content">`. Visible only while focused. */
export function SkipLink() {
    const { t } = useLanguage();
    return (
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
            {t('shell.skip')}
        </a>
    );
}
