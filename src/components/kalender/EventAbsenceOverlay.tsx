'use client';

import { useEffect, useState } from 'react';
import { UserX } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type EventAbsence, periodLabel } from '@/lib/absences';
import { formatDate } from '@/lib/clubMembers';

/**
 * Overlay hint in the event detail for `absences:read` ("laut Krankmeldung abwesend"): who of the caller's scope has a report
 * on the day of the event. Only names and period, never the kind or note. A failing request hides the hint (it is an aid,
 * not part of the event).
 */
export default function EventAbsenceOverlay({ clubId, eventId }: { clubId: string; eventId: string }) {
    const { t, language } = useLanguage();
    const [rows, setRows] = useState<EventAbsence[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: EventAbsence[] }>(`/absences/event/${encodeURIComponent(eventId)}?clubId=${encodeURIComponent(clubId)}`)
            .then((res) => !cancelled && setRows(res.data))
            .catch(() => !cancelled && setRows([]));
        return () => {
            cancelled = true;
        };
    }, [clubId, eventId]);

    if (!rows || rows.length === 0) return null;
    return (
        <div role="status" className="rounded-lg bg-warning/10 p-3 text-foreground">
            <p className="flex items-center gap-2 text-sm font-semibold">
                <UserX className="h-4 w-4 shrink-0 text-warning" aria-hidden />
                {t('absence.overlay.title', { count: rows.length })}
            </p>
            <ul className="mt-1 space-y-0.5 text-sm">
                {rows.map((r) => (
                    <li key={r.clubMemberId}>
                        {r.displayName} <span className="text-muted-foreground">({periodLabel(r.startsOn, r.endsOn, (d) => formatDate(d, language))})</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
