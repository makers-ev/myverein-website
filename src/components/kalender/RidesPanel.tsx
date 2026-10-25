'use client';

import { useCallback, useEffect, useState } from 'react';
import { Car } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { useConfirm } from '@/components/useConfirm';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { eventErrorKey } from '@/lib/eventErrors';
import { type Ride, MAX_SEATS, pendingRequests, requestFor, rideBody, rideProblem } from '@/lib/rides';

import ActingFor, { type Actor, SELF, useWards } from './ActingFor';
import { type CalendarEvent, inputClass, labelClass, primaryBtn, secondaryBtn, toLocalInput } from './calendarTypes';

interface Props {
    clubId: string;
    event: CalendarEvent;
    ownClubMemberId: string | null;
}

/** Ride shares (W10): offer a ride, ask for a seat (also for wards), the driver confirms or declines. */
export default function RidesPanel({ clubId, event, ownClubMemberId }: Props) {
    const { t, language } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [rides, setRides] = useState<Ride[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [actor, setActor] = useState<Actor>(SELF);
    const [form, setForm] = useState<{ ride?: Ride } | null>(null);
    const wards = useWards(clubId);
    const base = `/events/${event.id}/rides`;
    const q = `clubId=${clubId}`;
    const locked = Boolean(event.cancelled);

    const load = useCallback(() => {
        setFailed(false);
        apiFetch<{ data: { rides: Ride[] } }>(`${base}?${q}`)
            .then((res) => setRides(res.data.rides))
            .catch(() => setFailed(true));
    }, [base, q]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    async function act(doIt: () => Promise<unknown>) {
        setBusy(true);
        setError(null);
        try {
            await doIt();
            load();
        } catch (err) {
            setError(t(eventErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    if (failed) return <LoadError onRetry={load} />;
    if (!rides) return <LoadingText />;

    return (
        <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-48 flex-1">
                    <ActingFor clubId={clubId} wards={wards} canPickAny={false} value={actor} onChange={setActor} label={t('rides.actingFor')} />
                </div>
                {!locked && (
                    <button type="button" onClick={() => setForm({})} className={primaryBtn}>
                        {t('rides.offer')}
                    </button>
                )}
            </div>
            <p className="text-xs text-muted-foreground">{t('rides.privacy')}</p>
            {error && (
                <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
                    {error}
                </p>
            )}
            {rides.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center text-muted-foreground">
                    <Car className="h-6 w-6" aria-hidden />
                    <p>{t('rides.empty')}</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {rides.map((ride) => {
                        const mineReq = requestFor(ride, actor.clubMemberId, ownClubMemberId);
                        const open = pendingRequests(ride);
                        return (
                            <li key={ride.id} className="space-y-2 rounded-lg border border-border p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold text-foreground">{t('rides.driver', { name: ride.driver.displayName ?? t('helpers.someone') })}</p>
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ride.seatsFree > 0 ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                                        {t('rides.seats', { free: ride.seatsFree, total: ride.seats })}
                                    </span>
                                </div>
                                <p className="text-foreground">
                                    {ride.departureAt ? new Date(ride.departureAt).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' }) : t('rides.noTime')}
                                    {' · '}
                                    {ride.placeHidden ? <span className="text-muted-foreground">{t('rides.placeHidden')}</span> : ride.departurePlace}
                                </p>
                                {ride.note && !ride.placeHidden && <p className="whitespace-pre-line text-muted-foreground">{ride.note}</p>}

                                {!ride.mine && mineReq && (
                                    <p className="flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${mineReq.status === 'zugesagt' ? 'bg-success/15 text-success' : mineReq.status === 'abgelehnt' ? 'bg-destructive/10 text-destructive' : 'bg-warning/15 text-warning'}`}>
                                            {t(`rides.status.${mineReq.status}`)}
                                        </span>
                                        <button type="button" disabled={busy} onClick={() => void act(() => apiFetch(`${base}/${ride.id}/requests/${mineReq.requestId}?${q}`, { method: 'DELETE' }))} className={`${secondaryBtn} !px-3 !py-1 text-xs`}>
                                            {t('rides.request.withdraw')}
                                        </button>
                                    </p>
                                )}
                                {!ride.mine && !mineReq && !locked && (
                                    <button
                                        type="button"
                                        disabled={busy || ride.seatsFree === 0}
                                        onClick={() => void act(() => apiFetch(`${base}/${ride.id}/requests?${q}`, { method: 'POST', body: actor.clubMemberId ? { clubMemberId: actor.clubMemberId } : {} }))}
                                        className={secondaryBtn}
                                    >
                                        {ride.seatsFree === 0 ? t('rides.full') : actor.clubMemberId ? t('rides.request.for', { name: actor.name }) : t('rides.request')}
                                    </button>
                                )}

                                {ride.mine && (
                                    <div className="space-y-2 border-t border-dashed border-border pt-2">
                                        {open.length === 0 && (ride.requests ?? []).length === 0 && <p className="text-xs text-muted-foreground">{t('rides.noRequests')}</p>}
                                        {(ride.requests ?? []).map((r) => (
                                            <div key={r.requestId} className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="text-foreground">
                                                    {r.displayName ?? t('helpers.someone')} · <span className="text-xs text-muted-foreground">{t(`rides.status.${r.status}`)}</span>
                                                </span>
                                                <span className="flex gap-2">
                                                    {r.status === 'angefragt' && (
                                                        <>
                                                            <button type="button" disabled={busy} onClick={() => void act(() => apiFetch(`${base}/${ride.id}/requests/${r.requestId}?${q}`, { method: 'PATCH', body: { status: 'zugesagt' } }))} className={`${primaryBtn} !px-3 !py-1 text-xs`}>
                                                                {t('rides.accept')}
                                                            </button>
                                                            <button type="button" disabled={busy} onClick={() => void act(() => apiFetch(`${base}/${ride.id}/requests/${r.requestId}?${q}`, { method: 'PATCH', body: { status: 'abgelehnt' } }))} className={`${secondaryBtn} !px-3 !py-1 text-xs`}>
                                                                {t('rides.decline')}
                                                            </button>
                                                        </>
                                                    )}
                                                    {r.status === 'zugesagt' && (
                                                        <button type="button" disabled={busy} onClick={() => void act(() => apiFetch(`${base}/${ride.id}/requests/${r.requestId}?${q}`, { method: 'DELETE' }))} className={`${secondaryBtn} !px-3 !py-1 text-xs`}>
                                                            {t('rides.remove')}
                                                        </button>
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setForm({ ride })} className={`${secondaryBtn} !px-3 !py-1 text-xs`}>
                                                {t('rides.edit')}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() =>
                                                    void (async () => {
                                                        if (await confirm({ title: t('rides.delete'), body: t('rides.delete.body'), confirmLabel: t('rides.delete'), danger: true })) await act(() => apiFetch(`${base}/${ride.id}?${q}`, { method: 'DELETE' }));
                                                    })()
                                                }
                                                className="rounded-lg border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                                            >
                                                {t('rides.delete')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            {form && (
                <RideForm
                    key={form.ride?.id ?? 'new'}
                    ride={form.ride}
                    defaultAt={event.startsAt}
                    onCancel={() => setForm(null)}
                    onSubmit={async (body) => {
                        await apiFetch(form.ride ? `${base}/${form.ride.id}?${q}` : `${base}?${q}`, { method: form.ride ? 'PATCH' : 'POST', body });
                        setForm(null);
                        load();
                    }}
                />
            )}
            {dialog}
        </div>
    );
}

function RideForm({ ride, defaultAt, onCancel, onSubmit }: { ride?: Ride; defaultAt: string; onCancel: () => void; onSubmit: (body: Record<string, unknown>) => Promise<void> }) {
    const { t } = useLanguage();
    const [seats, setSeats] = useState(String(ride?.seats ?? 3));
    const [place, setPlace] = useState(ride?.departurePlace ?? '');
    const [at, setAt] = useState(ride?.departureAt ? toLocalInput(new Date(ride.departureAt)) : toLocalInput(new Date(new Date(defaultAt).getTime() - 3600_000)));
    const [note, setNote] = useState(ride?.note ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const problem = rideProblem(seats, place);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (problem) return;
        setBusy(true);
        setError(null);
        try {
            await onSubmit(rideBody(seats, place, at, note));
        } catch (err) {
            setError(t(eventErrorKey(err)));
            setBusy(false);
        }
    }

    return (
        <form onSubmit={(e) => void submit(e)} className="space-y-3 rounded-lg border border-border p-3">
            <h3 className="font-semibold text-foreground">{t(ride ? 'rides.edit' : 'rides.offer')}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <label htmlFor="ride-seats" className={labelClass}>
                        {t('rides.form.seats')} *
                    </label>
                    <input id="ride-seats" type="number" min={1} max={MAX_SEATS} required value={seats} onChange={(e) => setSeats(e.target.value)} aria-invalid={problem === 'seats'} className={inputClass} />
                    <p className="mt-1 text-xs text-muted-foreground">{t('rides.form.seats.hint', { max: MAX_SEATS })}</p>
                </div>
                <div>
                    <label htmlFor="ride-at" className={labelClass}>
                        {t('rides.form.at')}
                    </label>
                    <input id="ride-at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={inputClass} />
                </div>
            </div>
            <div>
                <label htmlFor="ride-place" className={labelClass}>
                    {t('rides.form.place')} *
                </label>
                <input id="ride-place" type="text" required maxLength={200} value={place} onChange={(e) => setPlace(e.target.value)} className={inputClass} />
                <p className="mt-1 text-xs text-muted-foreground">{t('rides.form.place.hint')}</p>
            </div>
            <div>
                <label htmlFor="ride-note" className={labelClass}>
                    {t('rides.form.note')}
                </label>
                <textarea id="ride-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
            </div>
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            <div className="flex gap-2">
                <button type="submit" disabled={busy || problem !== null} className={primaryBtn}>
                    {t('kalender.save')}
                </button>
                <button type="button" onClick={onCancel} className={secondaryBtn}>
                    {t('kalender.cancel')}
                </button>
            </div>
        </form>
    );
}
