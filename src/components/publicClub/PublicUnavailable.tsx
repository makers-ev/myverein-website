'use client';

import { useLanguage } from '@/contexts/LanguageContext';

/** Shown when the backend cannot be reached (not for a missing club, that is the regular 404). */
export default function PublicUnavailable() {
    const { t } = useLanguage();
    return (
        <div className="mx-auto max-w-xl px-4 py-16 text-center" role="status">
            <h1 className="font-display text-3xl text-foreground">{t('pc.unavailable.title')}</h1>
            <p className="mt-3 text-muted-foreground">{t('pc.unavailable.body')}</p>
        </div>
    );
}
