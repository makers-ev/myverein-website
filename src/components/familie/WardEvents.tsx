'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type EventBuckets, type WardEvent, bucketEvents, eventsRange, familieErrorKey } from '@/lib/familie';
import { primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { Chip, EmptyState, SectionCard } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';

type Status = 'angemeldet' | 'abgesagt';

function EventRow({ event, busy, onRespond, onClear }: { event: WardEvent; busy: boolean; onRespond: (status: Status) => void; onClear: () => void }) {
    const { t, language } = useLanguage();
    const start = new Date(event.startsAt);
    const cancelled = event.cancelledAt !== null;
    return (
        <li className="rounded-lg border border-border bg-card p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                        {start.toLocaleDateString(language, { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' })},{' '}
                        {start.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })}
                        {event.locationName ? ` · ${event.locationName}` : ''} · {event.calendarName}
                    </p>
                </div>
                {cancelled ? (
                    <Chip tone="destructive">{t('familie.events.cancelled')}</Chip>
                ) : (
                    <Chip tone={event.response === 'angemeldet' ? 'success' : event.response === 'warteliste' ? 'warning' : 'muted'}>{t(`familie.events.response.${event.response ?? 'none'}`)}</Chip>
                )}
            </div>
            {cancelled && event.cancelReason && <p className="mt-1 text-xs text-muted-foreground">{event.cancelReason}</p>}
            {!cancelled && event.canRespond && (
                <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled={busy || event.response === 'angemeldet'} aria-pressed={event.response === 'angemeldet'} onClick={() => onRespond('angemeldet')} className={primaryButtonClass}>
                        {t('familie.events.accept')}
                    </button>
                    <button type="button" disabled={busy || event.response === 'abgesagt'} aria-pressed={event.response === 'abgesagt'} onClick={() => onRespond('abgesagt')} className={secondaryButtonClass}>
                        {t('familie.events.decline')}
                    </button>
                    {event.response && (
                        <button type="button" disabled={busy} onClick={onClear} className="px-2 text-sm text-muted-foreground underline">
                            {t('familie.events.clear')}
                        </button>
                    )}
                </div>
            )}
            {!cancelled && !event.canRespond && <p className="mt-2 text-xs text-muted-foreground">{t('familie.events.ownAccount')}</p>}
        </li>
    );
}

function Group({ title, events, busyId, onRespond, onClear }: { title: string; events: WardEvent[]; busyId: string | null; onRespond: (e: WardEvent, s: Status) => void; onClear: (e: WardEvent) => void }) {
    if (events.length === 0) return null;
    return (
        <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
            <ul className="space-y-2">
                {events.map((e) => (
                    <EventRow key={e.id} event={e} busy={busyId === e.id} onRespond={(s) => onRespond(e, s)} onClear={() => onClear(e)} />
                ))}
            </ul>
        </div>
    );
}

/** "Heute" / "Diese Woche" / "Später" for one ward, with Zusage/Absage per event (`PUT|DELETE /guardian/wards/:id/events/:eventId/response`). */
export default function WardEvents({ clubId, wardId, onChanged }: { clubId: string; wardId: string; onChanged?: () => void }) {
    const { t } = useLanguage();
    const [events, setEvents] = useState<WardEvent[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const base = `/guardian/wards/${encodeURIComponent(wardId)}`;

    const load = useCallback(async () => {
        setLoadError(false);
        const { from, to } = eventsRange();
        try {
            const res = await apiFetch<{ data: WardEvent[] }>(`${base}/events?clubId=${encodeURIComponent(clubId)}&from=${from}&to=${to}`);
            setEvents(res.data);
        } catch {
            setLoadError(true);
        }
    }, [base, clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    async function run(event: WardEvent, action: () => Promise<unknown>) {
        setBusyId(event.id);
        setError(null);
        try {
            await action();
            await load();
            onChanged?.();
        } catch (err) {
            setError(t(familieErrorKey(err)));
            await load();
        } finally {
            setBusyId(null);
        }
    }

    const url = (event: WardEvent) => `${base}/events/${encodeURIComponent(event.id)}/response?clubId=${encodeURIComponent(clubId)}`;
    const buckets: EventBuckets | null = events ? bucketEvents(events) : null;
    const none = buckets && buckets.today.length + buckets.week.length + buckets.later.length === 0;

    return (
        <SectionCard title={t('familie.events.title')}>
            {loadError ? (
                <p role="alert" className="text-sm text-destructive">
                    {t('common.error')}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        {t('common.retry')}
                    </button>
                </p>
            ) : !buckets ? (
                <LoadingText />
            ) : none ? (
                <EmptyState icon={<CalendarDays className="h-6 w-6" aria-hidden />} text={t('familie.events.empty')} />
            ) : (
                <div className="space-y-4">
                    <Group title={t('familie.events.today')} events={buckets.today} busyId={busyId} onRespond={(e, s) => void run(e, () => apiFetch(url(e), { method: 'PUT', body: { status: s } }))} onClear={(e) => void run(e, () => apiFetch(url(e), { method: 'DELETE' }))} />
                    <Group title={t('familie.events.week')} events={buckets.week} busyId={busyId} onRespond={(e, s) => void run(e, () => apiFetch(url(e), { method: 'PUT', body: { status: s } }))} onClear={(e) => void run(e, () => apiFetch(url(e), { method: 'DELETE' }))} />
                    <Group title={t('familie.events.later')} events={buckets.later} busyId={busyId} onRespond={(e, s) => void run(e, () => apiFetch(url(e), { method: 'PUT', body: { status: s } }))} onClear={(e) => void run(e, () => apiFetch(url(e), { method: 'DELETE' }))} />
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                </div>
            )}
        </SectionCard>
    );
}
