'use client';

import { PauseCircle } from 'lucide-react';

import { useActiveClub } from '@/components/shell/ActiveClubProvider';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/clubMembers';

/**
 * Calm, permanent notice on every page while the active club is suspended by the platform (from `GET /my-clubs`, so it shows before any
 * club route answers `403 CLUB_SUSPENDED`). Shows the note meant for members, never the internal reason.
 */
export default function ClubSuspensionBanner() {
    const { t, language } = useLanguage();
    const { activeClub } = useActiveClub();
    const s = activeClub?.suspension;
    if (!s) return null;
    return (
        <div role="status" className="mx-auto mt-4 flex max-w-6xl items-start gap-3 rounded-xl border border-control bg-card px-4 py-3 text-sm sm:mx-6 lg:mx-8">
            <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
                <p className="font-semibold text-foreground">{t('clubSuspended.title')}</p>
                <p className="mt-1 text-foreground">{t('clubSuspended.body')}</p>
                {s.since && <p className="mt-1 text-xs text-muted-foreground">{t('clubSuspended.since', { date: formatDate(s.since, language) })}</p>}
                {s.note && <p className="mt-2 whitespace-pre-line rounded-lg bg-muted px-3 py-2 text-foreground">{s.note}</p>}
            </div>
        </div>
    );
}
