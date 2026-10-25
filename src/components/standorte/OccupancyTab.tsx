'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { Modal } from '@/components/Modal';
import { useConfirm } from '@/components/useConfirm';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { eventErrorKey } from '@/lib/eventErrors';
import { GRID_END_HOUR, GRID_START_HOUR, type Occupancy, type OccupancyItem, addDays, blockOnDay, bookingProblem, rangeQuery, weekStart } from '@/lib/occupancy';
import { toLocalInput } from '@/components/kalender/calendarTypes';

import { EmptyState, inputClass, primaryButtonClass, secondaryButtonClass } from './ui';
import type { Location } from './StandorteTab';

const HOURS = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i);
const ROW_PX = 32;

/** Weekly occupancy grid per place (W10): bookings and events together, booking with a live conflict hint (`locations:write`). */
export default function OccupancyTab({ clubId, locations, canWrite }: { clubId: string; locations: Location[]; canWrite: boolean }) {
    const { t, language } = useLanguage();
    const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
    const [week, setWeek] = useState(() => weekStart(new Date()));
    const [data, setData] = useState<Occupancy | null>(null);
    const [failed, setFailed] = useState(false);
    const [booking, setBooking] = useState<{ item?: OccupancyItem } | null>(null);

    const load = useCallback(() => {
        if (!locationId) return;
        setFailed(false);
        apiFetch<{ data: Occupancy }>(`/locations/${locationId}/bookings?clubId=${clubId}&${rangeQuery(week, 7)}`)
            .then((res) => setData(res.data))
            .catch(() => setFailed(true));
    }, [clubId, locationId, week]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    if (locations.length === 0) return <EmptyState icon={null} text={t('occupancy.empty')} />;

    const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
    const items = data && data.locationId === locationId ? data.items : [];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-48">
                    <label htmlFor="occ-location" className="mb-1 block text-xs font-medium text-muted-foreground">
                        {t('occupancy.location')}
                    </label>
                    <select id="occ-location" value={locationId} onChange={(e) => { setLocationId(e.target.value); setData(null); }} className={inputClass}>
                        {locations.map((l) => (
                            <option key={l.id} value={l.id}>
                                {l.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" aria-label={t('occupancy.prev')} onClick={() => setWeek(addDays(week, -7))} className={secondaryButtonClass}>
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                    </button>
                    <button type="button" onClick={() => setWeek(weekStart(new Date()))} className={secondaryButtonClass}>
                        {t('occupancy.today')}
                    </button>
                    <button type="button" aria-label={t('occupancy.next')} onClick={() => setWeek(addDays(week, 7))} className={secondaryButtonClass}>
                        <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                    {canWrite && data?.bookable && (
                        <button type="button" onClick={() => setBooking({})} className={primaryButtonClass}>
                            <Plus className="h-4 w-4" aria-hidden />
                            {t('occupancy.book')}
                        </button>
                    )}
                </div>
            </div>
            <h2 className="text-sm font-bold text-foreground" aria-live="polite">
                {days[0]!.toLocaleDateString(language, { day: 'numeric', month: 'short' })} – {days[6]!.toLocaleDateString(language, { day: 'numeric', month: 'short', year: 'numeric' })}
            </h2>
            {data && !data.bookable && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{t('occupancy.notBookable')}</p>}

            {failed ? (
                <LoadError onRetry={load} />
            ) : !data || data.locationId !== locationId ? (
                <LoadingText />
            ) : (
                <>
                    {items.length === 0 && <p className="text-sm text-muted-foreground">{t('occupancy.free')}</p>}
                    <div className="relative overflow-x-auto rounded-xl border border-border bg-card">
                        <div className="grid min-w-[640px] grid-cols-[3rem_repeat(7,1fr)]">
                            <div />
                            {days.map((d) => (
                                <div key={d.toISOString()} className="border-l border-border px-1 py-1.5 text-center text-xs font-semibold text-foreground">
                                    {d.toLocaleDateString(language, { weekday: 'short', day: '2-digit' })}
                                </div>
                            ))}
                            <div aria-hidden>
                                {HOURS.map((h) => (
                                    <div key={h} style={{ height: ROW_PX }} className="pr-1 text-right text-[10px] text-muted-foreground">
                                        {String(h).padStart(2, '0')}
                                    </div>
                                ))}
                            </div>
                            {days.map((d) => (
                                <div key={d.toISOString()} className="relative border-l border-border" style={{ height: ROW_PX * HOURS.length }}>
                                    {HOURS.map((h) => (
                                        <div key={h} style={{ height: ROW_PX }} className="border-t border-border/50" aria-hidden />
                                    ))}
                                    {items.map((it) => {
                                        const b = blockOnDay(it, d);
                                        if (!b) return null;
                                        const label = it.title ?? t('occupancy.busy');
                                        const editable = canWrite && it.type === 'booking';
                                        const cls = `absolute inset-x-0.5 overflow-hidden rounded-md px-1 py-0.5 text-left text-[11px] leading-tight ${it.type === 'booking' ? 'bg-primary/20 text-foreground' : 'bg-warning/20 text-foreground'}`;
                                        const style = { top: `${b.top}%`, height: `${b.height}%` };
                                        const title = `${label} (${t(`occupancy.kind.${it.type}`)})`;
                                        return editable ? (
                                            <button key={`${it.id}-${d.getDate()}`} type="button" style={style} className={cls} title={title} onClick={() => setBooking({ item: it })}>
                                                {label}
                                            </button>
                                        ) : (
                                            <div key={`${it.id}-${d.getDate()}`} style={style} className={cls} title={title}>
                                                {label}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                    {items.length > 0 && (
                        <ul className="sr-only">
                            {items.map((it) => (
                                <li key={it.id}>
                                    {t(`occupancy.kind.${it.type}`)}: {it.title ?? t('occupancy.busy')}, {new Date(it.startsAt).toLocaleString(language)} – {new Date(it.endsAt).toLocaleString(language)}
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
            {booking && <BookingModal clubId={clubId} locationId={locationId} item={booking.item} week={week} onClose={() => setBooking(null)} onSaved={() => { setBooking(null); load(); }} />}
        </div>
    );
}

interface ConflictResult {
    free: boolean;
    conflicts: OccupancyItem[];
}

function BookingModal({ clubId, locationId, item, week, onClose, onSaved }: { clubId: string; locationId: string; item?: OccupancyItem; week: Date; onClose: () => void; onSaved: () => void }) {
    const { t, language } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const defaultStart = new Date(week.getFullYear(), week.getMonth(), week.getDate(), 18);
    const [title, setTitle] = useState(item?.title ?? '');
    const [startsAt, setStartsAt] = useState(toLocalInput(item ? new Date(item.startsAt) : defaultStart));
    const [endsAt, setEndsAt] = useState(toLocalInput(item ? new Date(item.endsAt) : new Date(defaultStart.getTime() + 2 * 3600_000)));
    const [check, setCheck] = useState<ConflictResult | 'loading' | 'error' | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const problem = bookingProblem(title, startsAt, endsAt);
    const timeOk = bookingProblem('x', startsAt, endsAt) === null;

    useEffect(() => {
        if (!timeOk) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCheck(null);
            return;
        }
        let alive = true;
        setCheck('loading');
        const timer = setTimeout(() => {
            const qs = new URLSearchParams({ clubId, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString() });
            if (item) qs.set('excludeBookingId', item.id);
            apiFetch<{ data: ConflictResult }>(`/locations/${locationId}/conflicts?${qs.toString()}`)
                .then((res) => alive && setCheck(res.data))
                .catch(() => alive && setCheck('error'));
        }, 350);
        return () => {
            alive = false;
            clearTimeout(timer);
        };
    }, [clubId, locationId, startsAt, endsAt, timeOk, item]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (problem) return;
        setBusy(true);
        setError(null);
        try {
            await apiFetch(item ? `/locations/${locationId}/bookings/${item.id}?clubId=${clubId}` : `/locations/${locationId}/bookings?clubId=${clubId}`, {
                method: item ? 'PATCH' : 'POST',
                body: { title: title.trim(), startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString() },
            });
            onSaved();
        } catch (err) {
            setError(t(eventErrorKey(err)));
            setBusy(false);
        }
    }

    async function remove() {
        if (!item || !(await confirm({ title: t('occupancy.booking.delete'), body: item.title ?? '', confirmLabel: t('occupancy.booking.delete'), danger: true }))) return;
        try {
            await apiFetch(`/locations/${locationId}/bookings/${item.id}?clubId=${clubId}`, { method: 'DELETE' });
            onSaved();
        } catch (err) {
            setError(t(eventErrorKey(err)));
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={t(item ? 'occupancy.booking.edit' : 'occupancy.booking.title')}
            footer={
                <div className="flex justify-between gap-2">
                    <div>
                        {item && (
                            <button type="button" onClick={() => void remove()} className="rounded-lg border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
                                {t('occupancy.booking.delete')}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className={secondaryButtonClass}>
                            {t('kalender.cancel')}
                        </button>
                        <button type="submit" form="booking-form" disabled={busy || problem !== null} className={primaryButtonClass}>
                            {t('kalender.save')}
                        </button>
                    </div>
                </div>
            }
        >
            <form id="booking-form" onSubmit={(e) => void submit(e)} className="space-y-4">
                <div>
                    <label htmlFor="bk-title" className="mb-1 block text-xs font-medium text-muted-foreground">
                        {t('occupancy.booking.name')} *
                    </label>
                    <input id="bk-title" type="text" required autoFocus maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="bk-start" className="mb-1 block text-xs font-medium text-muted-foreground">
                            {t('occupancy.booking.start')} *
                        </label>
                        <input id="bk-start" type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="bk-end" className="mb-1 block text-xs font-medium text-muted-foreground">
                            {t('occupancy.booking.end')} *
                        </label>
                        <input id="bk-end" type="datetime-local" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)} aria-invalid={problem === 'order'} className={inputClass} />
                    </div>
                </div>
                {problem === 'order' && <p role="alert" className="text-xs text-destructive">{t('occupancy.booking.order')}</p>}
                <div aria-live="polite" className="text-sm">
                    {check === 'loading' && <p className="text-muted-foreground">{t('occupancy.booking.checking')}</p>}
                    {check && check !== 'loading' && check !== 'error' && (check.free ? (
                        <p className="text-success">{t('occupancy.booking.free')}</p>
                    ) : (
                        <div className="rounded-lg bg-warning/10 p-3 text-foreground">
                            <p className="font-medium">{t('occupancy.booking.conflict')}</p>
                            <ul className="mt-1 list-disc pl-5">
                                {check.conflicts.map((c) => (
                                    <li key={c.id}>
                                        {c.title ?? t('occupancy.busy')} ({new Date(c.startsAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })} – {new Date(c.endsAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            </form>
            {dialog}
        </Modal>
    );
}
