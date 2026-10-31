'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, HandHelping } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { eventErrorKey } from '@/lib/eventErrors';
import { type HelperPlan, type Shift, canOfferSwap, isOnShift, planTotals, shiftLight, swapActions } from '@/lib/helperPlan';

import ActingFor, { type Actor, SELF, useWards } from './ActingFor';
import HelperManage, { ShiftEditor, StationEditor } from './HelperManage';
import MemberPicker from './MemberPicker';
import { type CalendarEvent, primaryBtn, secondaryBtn } from './calendarTypes';

const LIGHT_STYLE = { red: 'bg-destructive/15 text-destructive', green: 'bg-success/15 text-success', yellow: 'bg-warning/15 text-warning' } as const;

function timeRange(startsAt: string, endsAt: string, language: string): string {
    const s = new Date(startsAt);
    const e = new Date(endsAt);
    const time: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    const day = s.toLocaleDateString(language, { weekday: 'short', day: '2-digit', month: '2-digit' });
    return `${day} ${s.toLocaleTimeString(language, time)} – ${e.toLocaleTimeString(language, time)}`;
}

interface Props {
    clubId: string;
    event: CalendarEvent;
    /** Club member id of the caller (`GET /club-members/me`); the acting person when no ward is chosen. */
    ownClubMemberId: string | null;
}

/**
 * Helper plan of an event (W8): stations and shifts with a traffic light, sign-up / withdraw / hand over / swap for yourself,
 * your wards and (organisers) anybody; organisers also edit the plan and get availability hints per shift.
 */
export default function HelperPlanPanel({ clubId, event, ownClubMemberId }: Props) {
    const { t, language } = useLanguage();
    const [plan, setPlan] = useState<HelperPlan | null>(null);
    const [failed, setFailed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [actor, setActor] = useState<Actor>(SELF);
    const [swapPickFor, setSwapPickFor] = useState<string | null>(null);
    const wards = useWards(clubId);
    const base = `/events/${event.id}/helpers`;
    const q = `clubId=${clubId}`;

    const load = useCallback(() => {
        setFailed(false);
        apiFetch<{ data: HelperPlan }>(`${base}?${q}`)
            .then((res) => setPlan(res.data))
            .catch(() => setFailed(true));
    }, [base, q]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    async function act(key: string, doIt: () => Promise<unknown>, done?: string) {
        setBusy(key);
        setError(null);
        setNotice(null);
        try {
            await doIt();
            if (done) setNotice(t(done));
            load();
        } catch (err) {
            setError(t(eventErrorKey(err)));
        } finally {
            setBusy(null);
        }
    }

    const who = actor.clubMemberId ? { clubMemberId: actor.clubMemberId } : {};
    const whoQuery = actor.clubMemberId ? `&clubMemberId=${actor.clubMemberId}` : '';
    const signUp = (shift: Shift, clubMemberId?: string) =>
        act(`s:${shift.id}`, () => apiFetch(`${base}/shifts/${shift.id}/signup?${q}`, { method: 'POST', body: clubMemberId ? { clubMemberId } : who }), 'helpers.notice.signedUp');
    const withdraw = (shift: Shift, clubMemberId?: string) =>
        act(`w:${shift.id}`, () => apiFetch(`${base}/shifts/${shift.id}/signup?${q}${clubMemberId ? `&clubMemberId=${clubMemberId}` : whoQuery}`, { method: 'DELETE' }), 'helpers.notice.withdrawn');
    const offer = (shift: Shift, toClubMemberId?: string) =>
        act(`o:${shift.id}`, () => apiFetch(`${base}/shifts/${shift.id}/swaps?${q}`, { method: 'POST', body: { ...who, ...(toClubMemberId ? { toClubMemberId } : {}) } }), toClubMemberId ? 'helpers.notice.swapSent' : 'helpers.notice.offered');
    const accept = (swapId: string) => act(`a:${swapId}`, () => apiFetch(`${base}/swaps/${swapId}/accept?${q}`, { method: 'POST', body: who }), 'helpers.notice.swapAccepted');
    const decline = (swapId: string) => act(`d:${swapId}`, () => apiFetch(`${base}/swaps/${swapId}/decline?${q}`, { method: 'POST', body: who }));
    const retract = (swapId: string) => act(`r:${swapId}`, () => apiFetch(`${base}/swaps/${swapId}?${q}${whoQuery}`, { method: 'DELETE' }));

    if (failed) return <LoadError onRetry={load} />;
    if (!plan) return <LoadingText />;

    const totals = planTotals(plan);
    const locked = plan.cancelled || Boolean(event.cancelled);
    const forSelf = actor.clubMemberId === null;
    const actingId = actor.clubMemberId ?? ownClubMemberId;

    return (
        <div className="space-y-4 text-sm">
            {locked && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">{t('helpers.cancelled')}</p>}

            {plan.mine.length > 0 && (
                <section aria-labelledby="my-shifts" className="rounded-lg border border-border p-3">
                    <h3 id="my-shifts" className="mb-1 font-semibold text-foreground">
                        {t('helpers.mine')}
                    </h3>
                    <ul className="space-y-0.5 text-foreground">
                        {plan.mine.map((m) => (
                            <li key={m.signupId}>
                                {m.stationName}: {timeRange(m.startsAt, m.endsAt, language)}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {!locked && <ActingFor clubId={clubId} wards={wards} canPickAny={plan.canManage} value={actor} onChange={setActor} label={t('helpers.actingFor')} />}
            {!forSelf && <p className="text-xs text-muted-foreground">{t('helpers.actingFor.hint', { name: actor.name })}</p>}

            {totals.shifts > 0 && (
                <p aria-live="polite" className="text-muted-foreground">
                    {t('helpers.summary', { shifts: totals.shifts, understaffed: totals.understaffed, open: totals.open })}
                </p>
            )}

            {notice && (
                <p role="status" className="rounded-lg bg-success/10 px-3 py-2 text-success">
                    {notice}
                </p>
            )}
            {error && (
                <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
                    {error}
                </p>
            )}

            {plan.stations.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center text-muted-foreground">
                    <HandHelping className="h-6 w-6" aria-hidden />
                    <p>{t(plan.canManage ? 'helpers.empty.manage' : 'helpers.empty')}</p>
                </div>
            ) : (
                plan.stations.map((station) => (
                    <section key={station.id} aria-labelledby={`station-${station.id}`} className="rounded-lg border border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
                            <div className="min-w-0">
                                <h3 id={`station-${station.id}`} className="font-semibold text-foreground">
                                    {station.name}
                                </h3>
                                {station.description && <p className="text-xs text-muted-foreground">{station.description}</p>}
                            </div>
                            {plan.canManage && !locked && <StationEditor clubId={clubId} eventId={event.id} station={station} onChanged={load} />}
                        </div>
                        {station.shifts.length === 0 && <p className="px-3 py-3 text-muted-foreground">{t('helpers.station.noShifts')}</p>}
                        <ul className="divide-y divide-border">
                            {station.shifts.map((shift) => {
                                const light = shiftLight(shift);
                                const swaps = swapActions(shift, actingId);
                                const onShift = isOnShift(shift, actingId);
                                const past = new Date(shift.endsAt).getTime() < Date.now();
                                return (
                                    <li key={shift.id} className="space-y-2 px-3 py-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="font-medium text-foreground">{timeRange(shift.startsAt, shift.endsAt, language)}</p>
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LIGHT_STYLE[light]}`}>
                                                {t(`helpers.light.${light}`)} · {shift.filled}/{shift.capacity}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {t('helpers.minStaff', { count: shift.minStaff })}
                                            {shift.understaffed ? ` · ${t('helpers.understaffed', { missing: Math.max(shift.minStaff - shift.filled, 0) })}` : ''}
                                        </p>
                                        {shift.signups.length > 0 ? (
                                            <ul className="flex flex-wrap gap-1.5">
                                                {shift.signups.map((s) => (
                                                    <li key={s.signupId} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${s.mine ? 'bg-primary/15 font-semibold text-primary' : 'bg-muted text-foreground'}`}>
                                                        {s.displayName ?? t('helpers.someone')}
                                                        {plan.canManage && !locked && !s.mine && (
                                                            <button type="button" disabled={busy !== null} aria-label={t('helpers.remove', { name: s.displayName ?? t('helpers.someone') })} onClick={() => void withdraw(shift, s.clubMemberId)} className="font-bold text-muted-foreground hover:text-foreground">
                                                                ×
                                                            </button>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">{t('helpers.nobody')}</p>
                                        )}

                                        {swaps.respond.map((w) => (
                                            <div key={w.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
                                                <ArrowLeftRight className="h-4 w-4 text-primary" aria-hidden />
                                                <span className="text-foreground">{t('helpers.swap.toMe', { name: w.fromName ?? t('helpers.someone') })}</span>
                                                <button type="button" disabled={busy !== null} onClick={() => void accept(w.id)} className={`${primaryBtn} !px-3 !py-1 text-xs`}>
                                                    {t('helpers.swap.accept')}
                                                </button>
                                                <button type="button" disabled={busy !== null} onClick={() => void decline(w.id)} className={`${secondaryBtn} !px-3 !py-1 text-xs`}>
                                                    {t('helpers.swap.decline')}
                                                </button>
                                            </div>
                                        ))}
                                        {swaps.takeOver.map((w) => (
                                            <div key={w.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2">
                                                <span className="text-foreground">{t('helpers.swap.open', { name: w.fromName ?? t('helpers.someone') })}</span>
                                                <button type="button" disabled={busy !== null || locked} onClick={() => void accept(w.id)} className={`${primaryBtn} !px-3 !py-1 text-xs`}>
                                                    {t('helpers.swap.takeOver')}
                                                </button>
                                            </div>
                                        ))}
                                        {swaps.withdraw.map((w) => (
                                            <div key={w.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2">
                                                <span className="text-foreground">{t(w.toClubMemberId ? 'helpers.swap.pendingTo' : 'helpers.swap.pendingOpen')}</span>
                                                <button type="button" disabled={busy !== null} onClick={() => void retract(w.id)} className={`${secondaryBtn} !px-3 !py-1 text-xs`}>
                                                    {t('helpers.swap.withdraw')}
                                                </button>
                                            </div>
                                        ))}

                                        {!locked && !past && (
                                            <div className="flex flex-wrap gap-2">
                                                {onShift ? (
                                                    <>
                                                        <button type="button" disabled={busy !== null} onClick={() => void withdraw(shift)} className={secondaryBtn}>
                                                            {forSelf ? t('helpers.withdraw') : t('helpers.withdraw.for', { name: actor.name })}
                                                        </button>
                                                        {canOfferSwap(shift, actingId) && (
                                                            <>
                                                                <button type="button" disabled={busy !== null} onClick={() => void offer(shift)} className={secondaryBtn}>
                                                                    {t('helpers.offer')}
                                                                </button>
                                                                <button type="button" disabled={busy !== null} onClick={() => setSwapPickFor(swapPickFor === shift.id ? null : shift.id)} aria-expanded={swapPickFor === shift.id} className={secondaryBtn}>
                                                                    {t('helpers.swapWith')}
                                                                </button>
                                                            </>
                                                        )}
                                                    </>
                                                ) : (
                                                    <button type="button" disabled={busy !== null || shift.full} onClick={() => void signUp(shift)} className={primaryBtn}>
                                                        {shift.full ? t('helpers.full') : forSelf ? t('helpers.signup') : t('helpers.signup.for', { name: actor.name })}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {swapPickFor === shift.id && (
                                            <div className="rounded-lg border border-border p-3">
                                                <MemberPicker
                                                    clubId={clubId}
                                                    label={t('helpers.swapWith.pick')}
                                                    onPick={(m) => {
                                                        setSwapPickFor(null);
                                                        void offer(shift, m.id);
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {plan.canManage && !locked && <ShiftEditor clubId={clubId} eventId={event.id} shift={shift} onChanged={load} onSignUp={(memberId) => signUp(shift, memberId)} />}
                                    </li>
                                );
                            })}
                        </ul>
                        {plan.canManage && !locked && <HelperManage mode="shift" clubId={clubId} eventId={event.id} stationId={station.id} event={event} onChanged={load} />}
                    </section>
                ))
            )}
            {plan.canManage && !locked && <HelperManage mode="station" clubId={clubId} eventId={event.id} event={event} onChanged={load} />}
        </div>
    );
}
