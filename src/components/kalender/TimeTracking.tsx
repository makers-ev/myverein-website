'use client';

import { useCallback, useEffect, useState } from 'react';
import { Play, Square } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { useConfirm } from '@/components/useConfirm';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { eventErrorKey } from '@/lib/eventErrors';
import { parseEuroInput, formatCost } from '@/lib/eventRegistration';
import { type RateCard, type TimeEntry, type TimeSuggestion, RATE_ROLES, defaultRange, manualProblem, rateBody, splitMinutes } from '@/lib/timeTracking';

import { type CalendarEvent, type Department, inputClass, labelClass, primaryBtn, secondaryBtn } from './calendarTypes';
import MemberPicker from './MemberPicker';
import StundenBericht from './StundenBericht';

interface Props {
    clubId: string;
    /** Trainers, leads and confirmers record hours; rate readers alone only see the report and rates. */
    canTrack: boolean;
    /** `time:write`: team view, confirm and reject. */
    canConfirm: boolean;
    /** `time:read_rates`: hourly rates and the amounts of the report. */
    canRates: boolean;
    ownClubMemberId: string | null;
    events: CalendarEvent[];
    departments: Department[];
}

function Duration({ minutes }: { minutes: number | null }) {
    const { t } = useLanguage();
    if (minutes === null) return <>{t('time.running')}</>;
    const d = splitMinutes(minutes);
    return <>{t('time.minutes', { hours: d.hours, minutes: d.minutes })}</>;
}

const STATUS_TONE = { offen: 'bg-warning/15 text-warning', bestaetigt: 'bg-success/15 text-success', abgelehnt: 'bg-destructive/10 text-destructive' } as const;

/** Trainer time tracking (W10): clock in/out, suggestions from attendance, manual entries, confirmation, hours report. Report only, no payout. */
export default function TimeTracking({ clubId, canTrack, canConfirm, canRates, ownClubMemberId, events, departments }: Props) {
    const { t, language } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const q = `clubId=${clubId}`;
    const [range, setRange] = useState(defaultRange);
    const [scope, setScope] = useState<'mine' | 'team'>('mine');
    const [status, setStatus] = useState('');
    const [entries, setEntries] = useState<TimeEntry[] | null>(null);
    const [current, setCurrent] = useState<TimeEntry | null>(null);
    const [suggestions, setSuggestions] = useState<TimeSuggestion[]>([]);
    const [failed, setFailed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [clockEvent, setClockEvent] = useState('');
    const [mStart, setMStart] = useState('');
    const [mEnd, setMEnd] = useState('');
    // Fixed when the tab opens: keeps render pure; the server re-checks "in the future" anyway.
    const [loadedAt] = useState(() => Date.now());

    const load = useCallback(() => {
        if (!canTrack) {
            setEntries([]);
            return;
        }
        setFailed(false);
        const qs = new URLSearchParams({ clubId, from: range.from, to: range.to, scope });
        if (status) qs.set('status', status);
        Promise.all([
            apiFetch<{ data: TimeEntry[] }>(`/time-entries?${qs.toString()}`),
            apiFetch<{ data: TimeEntry | null }>(`/time-entries/current?${q}`),
            apiFetch<{ data: TimeSuggestion[] }>(`/time-entries/suggestions?${q}&from=${range.from}&to=${range.to}`),
        ])
            .then(([list, cur, sug]) => {
                setEntries(list.data);
                setCurrent(cur.data);
                setSuggestions(sug.data);
            })
            .catch(() => setFailed(true));
    }, [clubId, q, range.from, range.to, scope, status, canTrack]);

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

    const manualIssue = mStart && mEnd ? manualProblem(mStart, mEnd, loadedAt) : null;
    const todayEvents = events.filter((e) => !e.cancelled && Math.abs(new Date(e.startsAt).getTime() - loadedAt) < 36 * 3600_000);

    if (failed) return <LoadError onRetry={load} />;
    if (!entries) return <LoadingText />;

    return (
        <div className="space-y-6 text-sm">
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-muted-foreground">{t('time.intro')}</p>
            {error && (
                <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
                    {error}
                </p>
            )}

            {canTrack && (
                <>
            <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <h3 className="font-semibold text-foreground">{t('time.clock.title')}</h3>
                {current ? (
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-foreground">
                            {t('time.clock.running', { since: new Date(current.startedAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }) })}
                            {current.eventTitle ? ` · ${current.eventTitle}` : ''}
                        </p>
                        <button type="button" disabled={busy} onClick={() => void act(() => apiFetch(`/time-entries/clock-out?${q}`, { method: 'POST' }))} className={`${primaryBtn} inline-flex items-center gap-1.5`}>
                            <Square className="h-4 w-4" aria-hidden />
                            {t('time.clock.out')}
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-48">
                            <label htmlFor="clock-event" className={labelClass}>
                                {t('time.clock.event')}
                            </label>
                            <select id="clock-event" value={clockEvent} onChange={(e) => setClockEvent(e.target.value)} className={inputClass}>
                                <option value="">{t('time.clock.noEvent')}</option>
                                {todayEvents.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {e.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button type="button" disabled={busy} onClick={() => void act(() => apiFetch(`/time-entries/clock-in?${q}`, { method: 'POST', body: clockEvent ? { eventId: clockEvent } : {} }))} className={`${primaryBtn} inline-flex items-center gap-1.5`}>
                            <Play className="h-4 w-4" aria-hidden />
                            {t('time.clock.in')}
                        </button>
                    </div>
                )}
            </section>

            {suggestions.length > 0 && (
                <section className="space-y-2 rounded-xl border border-border bg-card p-4">
                    <h3 className="font-semibold text-foreground">{t('time.suggestions.title')}</h3>
                    <p className="text-xs text-muted-foreground">{t('time.suggestions.hint')}</p>
                    <ul className="divide-y divide-border">
                        {suggestions.map((s) => (
                            <li key={s.eventId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                                <span className="text-foreground">
                                    {new Date(s.startsAt).toLocaleDateString(language, { day: '2-digit', month: '2-digit' })} · {s.title}
                                </span>
                                <button type="button" disabled={busy} onClick={() => void act(() => apiFetch(`/time-entries/from-event?${q}`, { method: 'POST', body: { eventId: s.eventId } }))} className={`${secondaryBtn} !px-3 !py-1 text-xs`}>
                                    {t('time.suggestions.take')}
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <h3 className="font-semibold text-foreground">{t('time.manual.title')}</h3>
                <form
                    className="flex flex-wrap items-end gap-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!mStart || !mEnd || manualIssue) return;
                        void act(async () => {
                            await apiFetch(`/time-entries?${q}`, { method: 'POST', body: { startedAt: new Date(mStart).toISOString(), endedAt: new Date(mEnd).toISOString() } });
                            setMStart('');
                            setMEnd('');
                        });
                    }}
                >
                    <div>
                        <label htmlFor="tm-start" className={labelClass}>
                            {t('time.manual.start')}
                        </label>
                        <input id="tm-start" type="datetime-local" required value={mStart} onChange={(e) => setMStart(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="tm-end" className={labelClass}>
                            {t('time.manual.end')}
                        </label>
                        <input id="tm-end" type="datetime-local" required value={mEnd} onChange={(e) => setMEnd(e.target.value)} aria-invalid={manualIssue !== null} className={inputClass} />
                    </div>
                    <button type="submit" disabled={busy || !mStart || !mEnd || manualIssue !== null} className={primaryBtn}>
                        {t('time.manual.submit')}
                    </button>
                    {manualIssue && (
                        <p role="alert" className="w-full text-xs text-destructive">
                            {t(manualIssue === 'order' ? 'events.err.invalid_time' : manualIssue === 'future' ? 'events.err.in_future' : 'events.err.too_long')}
                        </p>
                    )}
                </form>
            </section>

            <section className="space-y-3">
                <h3 className="font-semibold text-foreground">{t('time.entries.title')}</h3>
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label htmlFor="te-from" className={labelClass}>
                            {t('time.filter.from')}
                        </label>
                        <input id="te-from" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="te-to" className={labelClass}>
                            {t('time.filter.to')}
                        </label>
                        <input id="te-to" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="te-status" className={labelClass}>
                            {t('time.filter.status')}
                        </label>
                        <select id="te-status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                            <option value="">{t('time.filter.status.all')}</option>
                            {(['offen', 'bestaetigt', 'abgelehnt'] as const).map((s) => (
                                <option key={s} value={s}>
                                    {t(`time.status.${s}`)}
                                </option>
                            ))}
                        </select>
                    </div>
                    {canConfirm && (
                        <div role="group" aria-label={t('time.filter.status')} className="inline-flex rounded-lg border border-border bg-background p-0.5">
                            {(['mine', 'team'] as const).map((v) => (
                                <button key={v} type="button" aria-pressed={scope === v} onClick={() => setScope(v)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${scope === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                    {t(`time.filter.scope.${v}`)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {entries.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground">{t('time.entries.empty')}</p>
                ) : (
                    <div className="relative overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-left">
                            <caption className="sr-only">{t('time.entries.title')}</caption>
                            <thead className="bg-muted/50 text-xs text-muted-foreground">
                                <tr>
                                    <th scope="col" className="px-3 py-2">{t('time.col.person')}</th>
                                    <th scope="col" className="px-3 py-2">{t('time.col.time')}</th>
                                    <th scope="col" className="px-3 py-2">{t('time.col.duration')}</th>
                                    <th scope="col" className="px-3 py-2">{t('time.col.status')}</th>
                                    <th scope="col" className="px-3 py-2"><span className="sr-only">{t('participants.col.actions')}</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {entries.map((e) => (
                                    <tr key={e.id} className="align-top text-foreground">
                                        <th scope="row" className="px-3 py-2 font-medium">
                                            {e.displayName}
                                            <span className="block text-xs font-normal text-muted-foreground">
                                                {t(`time.source.${e.source}`)}
                                                {e.eventTitle ? ` · ${e.eventTitle}` : ''}
                                            </span>
                                        </th>
                                        <td className="px-3 py-2">
                                            {new Date(e.startedAt).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}
                                            {e.endedAt ? ` – ${new Date(e.endedAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}` : ''}
                                        </td>
                                        <td className="px-3 py-2 tabular-nums">
                                            <Duration minutes={e.minutes} />
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[e.status]}`}>{t(`time.status.${e.status}`)}</span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex flex-wrap gap-1.5">
                                                {canConfirm && e.status === 'offen' && !e.running && e.clubMemberId !== ownClubMemberId && (
                                                    <>
                                                        <button type="button" disabled={busy} onClick={() => void act(() => apiFetch(`/time-entries/${e.id}/confirm?${q}`, { method: 'POST' }))} className={`${primaryBtn} !px-2.5 !py-1 text-xs`}>
                                                            {t('time.confirm')}
                                                        </button>
                                                        <button type="button" disabled={busy} onClick={() => void (async () => { if (await confirm({ title: t('time.reject'), body: t('time.reject.body', { name: e.displayName }), confirmLabel: t('time.reject'), danger: true })) await act(() => apiFetch(`/time-entries/${e.id}/reject?${q}`, { method: 'POST' })); })()} className={`${secondaryBtn} !px-2.5 !py-1 text-xs`}>
                                                            {t('time.reject')}
                                                        </button>
                                                    </>
                                                )}
                                                {e.clubMemberId === ownClubMemberId && e.status === 'offen' && !e.running && (
                                                    <button type="button" disabled={busy} onClick={() => void (async () => { if (await confirm({ title: t('time.delete'), body: t('time.delete.body'), confirmLabel: t('time.delete'), danger: true })) await act(() => apiFetch(`/time-entries/${e.id}?${q}`, { method: 'DELETE' })); })()} className={`${secondaryBtn} !px-2.5 !py-1 text-xs`}>
                                                        {t('time.delete')}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

                </>
            )}
            {(canConfirm || canRates) && <StundenBericht clubId={clubId} range={range} departments={departments} />}
            {dialog}
            {canRates && <RateCards clubId={clubId} />}
        </div>
    );
}

function RateCards({ clubId }: { clubId: string }) {
    const { t, language } = useLanguage();
    const [cards, setCards] = useState<RateCard[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [target, setTarget] = useState<{ clubMemberId: string | null; roleType: string | null; name: string }>({ clubMemberId: null, roleType: 'trainer', name: '' });
    const [rate, setRate] = useState('');
    const [from, setFrom] = useState(() => defaultRange().from);
    const [until, setUntil] = useState('');
    const cents = parseEuroInput(rate);

    const load = useCallback(() => {
        setFailed(false);
        apiFetch<{ data: RateCard[] }>(`/rate-cards?clubId=${clubId}`)
            .then((res) => setCards(res.data))
            .catch(() => setFailed(true));
    }, [clubId]);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    async function add(e: React.FormEvent) {
        e.preventDefault();
        if (cents === null || cents === undefined || !from) return;
        setError(null);
        try {
            await apiFetch(`/rate-cards?clubId=${clubId}`, { method: 'POST', body: rateBody(target, cents, from, until) });
            setRate('');
            load();
        } catch (err) {
            setError(t(eventErrorKey(err)));
        }
    }

    async function remove(id: string) {
        setError(null);
        try {
            await apiFetch(`/rate-cards/${id}?clubId=${clubId}`, { method: 'DELETE' });
            load();
        } catch (err) {
            setError(t(eventErrorKey(err)));
        }
    }

    return (
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-foreground">{t('time.rates.title')}</h3>
            <p className="text-xs text-muted-foreground">{t('time.rates.hint')}</p>
            {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
            {failed ? (
                <LoadError onRetry={load} />
            ) : !cards ? (
                <LoadingText />
            ) : cards.length === 0 ? (
                <p className="text-muted-foreground">{t('time.rates.empty')}</p>
            ) : (
                <ul className="divide-y divide-border">
                    {cards.map((c) => (
                        <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                            <span className="text-foreground">
                                {c.displayName ?? (c.roleType ? t(`time.role.${c.roleType}`) : '—')} · {formatCost(c.hourlyRateCents, language)}
                                <span className="block text-xs text-muted-foreground">
                                    {c.validFrom}
                                    {c.validUntil ? ` – ${c.validUntil}` : ''}
                                </span>
                            </span>
                            <button type="button" onClick={() => void remove(c.id)} className={`${secondaryBtn} !px-3 !py-1 text-xs`}>
                                {t('time.delete')}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <form onSubmit={(e) => void add(e)} className="space-y-3 border-t border-border pt-3">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label htmlFor="rate-role" className={labelClass}>
                            {t('time.rates.for')}
                        </label>
                        <select
                            id="rate-role"
                            value={target.roleType === null ? 'person' : target.roleType}
                            onChange={(e) => setTarget(e.target.value === 'person' ? { clubMemberId: target.clubMemberId ?? '', roleType: null, name: target.name } : { clubMemberId: null, roleType: e.target.value, name: '' })}
                            className={inputClass}
                        >
                            {RATE_ROLES.map((r) => (
                                <option key={r} value={r}>
                                    {t(`time.role.${r}`)}
                                </option>
                            ))}
                            <option value="person">{t('time.rates.person')}</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="rate-value" className={labelClass}>
                            {t('time.rates.rate')}
                        </label>
                        <input id="rate-value" type="text" inputMode="decimal" required value={rate} onChange={(e) => setRate(e.target.value)} aria-invalid={cents === undefined} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="rate-from" className={labelClass}>
                            {t('time.rates.from')}
                        </label>
                        <input id="rate-from" type="date" required value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="rate-until" className={labelClass}>
                            {t('time.rates.until')}
                        </label>
                        <input id="rate-until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} className={inputClass} />
                    </div>
                </div>
                {target.roleType === null && (
                    <div>
                        {target.clubMemberId ? <p className="text-sm text-foreground">{target.name}</p> : null}
                        <MemberPicker clubId={clubId} label={t('time.rates.person')} onPick={(m) => setTarget({ clubMemberId: m.id, roleType: null, name: m.name })} />
                    </div>
                )}
                {cents === undefined && <p role="alert" className="text-xs text-destructive">{t('time.rates.invalid')}</p>}
                <button type="submit" disabled={cents === null || cents === undefined || !from || (target.roleType === null && !target.clubMemberId)} className={primaryBtn}>
                    {t('time.rates.add')}
                </button>
            </form>
        </section>
    );
}
