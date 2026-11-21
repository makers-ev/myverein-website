'use client';

import ClubFinder from '@/components/publicClub/ClubFinder';
import { useLanguage } from '@/contexts/LanguageContext';

/** Home page chapter "Verein finden" (Wave 15 W4): the opt-in club search for people who want to join a club that already uses MyVerein. */
export default function ClubFinderSection() {
    const { t } = useLanguage();
    return (
        <section id="verein-finden" className="border-t border-hairline" aria-label={t('finder.title')}>
            <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
                <ClubFinder />
                <p className="mt-3 text-center text-sm text-muted-foreground">{t('finder.home.hint')}</p>
            </div>
        </section>
    );
}
