'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCheck, Lock, UserPlus } from 'lucide-react';

import { Modal } from '@/components/Modal';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { Toggle } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import {
    ATTENDANCE_STATUSES,
    type AttendanceChange,
    type AttendanceEntry,
    type AttendanceStatus,
    type AttendanceView,
    applyPending,
    changeFor,
    supervisionMissing,
    toggledStatus,
} from '@/lib/attendance';
import { eventErrorKey } from '@/lib/eventErrors';

import { type CalendarEvent, inputClass, labelClass, primaryBtn, secondaryBtn } from './calendarTypes';
import MemberPicker from './MemberPicker';

interface Props {
    clubId: string;
    event: CalendarEvent;
}

const STATUS_STYLE: Record<AttendanceStatus, string> = {
    anwesend: 'bg-success text-success-foreground',
    entschuldigt: 'bg-warning text-warning-foreground',
    unentschuldigt: 'bg-destructive text-destructive-foreground',
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Attendance list of one event (W4). Tapping a status is buffered and sent as ONE batch (`PUT`, idempotent) shortly
 * afterwards; while the request is outstanding or failed the local state wins, so a flaky connection never loses taps.
 */
export default function AttendancePanel({ clubId, event }: Props) {
    const { t } = useLanguage();
    const base = `/events/${event.id}/attendance`;
    const q = `?clubId=${clubId}`;
    const [view, setView] = useState<AttendanceView | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [guestName, setGuestName] = useState('');
    const [closing, setClosing] = useState(false);
    const [markOpen, setMarkOpen] = useState(false);
    const [supervisorPick, setSupervisorPick] = useState('');
    type PendingItem = { change: AttendanceChange; status: AttendanceStatus | null };
    const [pendingState, setPendingState] = useState<Map<string, PendingItem>>(new Map());
    const pending = useRef(new Map<string, PendingItem>());
    const inFlight = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reasonRef = useRef('');
    useEffect(() => {
        reasonRef.current = reason;
    }, [reason]);

    /** Publishes the buffer (a ref, so the async sender sees the latest taps) to the render state. */
    const publish = useCallback(() => setPendingState(new Map(pending.current)), []);

    const load = useCallback(() => {
        setLoadError(false);
        apiFetch<{ data: AttendanceView }>(`${base}${q}`)
            .then((res) => setView(res.data))
            .catch(() => setLoadError(true));
    }, [base, q]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [load]);

    /** Sends a batch; resolves true on success. */
    const send = useCallback(
        async (changes: AttendanceChange[]): Promise<boolean> => {
            try {
                const res = await apiFetch<{ data: AttendanceView }>(`${base}${q}`, { method: 'PUT', body: { entries: changes, ...(reasonRef.current.trim() ? { reason: reasonRef.current.trim() } : {}) } });
                setView(res.data);
                return true;
            } catch (err) {
                setError(t(eventErrorKey(err)));
                return false;
            }
        },
        [base, q, t],
    );

    const flush = useCallback(async () => {
        if (inFlight.current) return;
        inFlight.current = true;
        setError(null);
        // Taps that arrive while a request is out are sent by the next round of this loop.
        while (pending.current.size > 0) {
            const batch = new Map(pending.current);
            setSaveState('saving');
            const ok = await send([...batch.values()].map((b) => b.change));
            if (!ok) {
                setSaveState('error');
                inFlight.current = false;
                return;
            }
            // Drop what was sent unless the person tapped again in the meantime.
            for (const [key, item] of batch) if (pending.current.get(key) === item) pending.current.delete(key);
            publish();
        }
        setSaveState('saved');
        inFlight.current = false;
    }, [send, publish]);

    // Taps that are still buffered when the panel closes (tab change, dialog close) are sent right away; a page unload warns.
    useEffect(() => {
        const flushNow = () => {
            if (timer.current) clearTimeout(timer.current);
            void flush();
        };
        const warn = (e: BeforeUnloadEvent) => {
            if (pending.current.size > 0) e.preventDefault();
        };
        window.addEventListener('beforeunload', warn);
        return () => {
            window.removeEventListener('beforeunload', warn);
            flushNow();
        };
    }, [flush]);

    function schedule() {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void flush(), 500);
    }

    function setStatus(entry: AttendanceEntry, status: AttendanceStatus | null) {
        const change = changeFor(entry, status);
        if (!change) return;
        pending.current.set(entry.key, { change, status });
        publish();
        schedule();
    }

    const statusMap = new Map([...pendingState].map(([k, v]) => [k, v.status]));
    const shown = view ? applyPending(view, statusMap) : null;
    const locked = Boolean(event.cancelled);
    const needsReason = Boolean(shown?.closed);
    const canEdit = Boolean(shown?.canWrite) && !locked && (!needsReason || reason.trim().length > 0);

    async function addPerson(change: AttendanceChange): Promise<boolean> {
        setError(null);
        setSaveState('saving');
        const ok = await send([change]);
        setSaveState(ok ? 'saved' : 'error');
        return ok;
    }

    async function setSupervisors(ids: string[]) {
        setError(null);
        try {
            const res = await apiFetch<{ data: AttendanceView }>(`${base}/supervisors${q}`, { method: 'PUT', body: { clubMemberIds: ids, ...(reason.trim() ? { reason: reason.trim() } : {}) } });
            setView(res.data);
        } catch (err) {
            setError(t(eventErrorKey(err)));
        }
    }

    async function closeList() {
        setError(null);
        try {
            const res = await apiFetch<{ data: AttendanceView }>(`${base}/close${q}`, { method: 'POST', body: markOpen ? { markOpenAs: 'unentschuldigt' } : {} });
            setView(res.data);
            setClosing(false);
        } catch (err) {
            setError(t(eventErrorKey(err)));
            setClosing(false);
        }
    }

    const takenMembers = useMemo(() => new Set((shown?.entries ?? []).map((e) => e.clubMemberId).filter((x): x is string => !!x)), [shown]);

    if (loadError) return <LoadError onRetry={load} />;
    if (!shown) return <LoadingText />;

    const supervisorIds = new Set(shown.supervisors.map((s) => s.clubMemberId));
    const supervisorCandidates = shown.entries.filter((e) => e.clubMemberId && !e.isMinor && !supervisorIds.has(e.clubMemberId));
    const warn = shown.supervisionWarning || supervisionMissing(shown.entries, shown.supervisors);
    const unsaved = pendingState.size > 0;

    return (
        <div className="space-y-4 text-sm">
            {shown.closed && (
                <div role="status" className="flex items-start gap-2 rounded-lg bg-muted p-3 text-foreground">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <p>{t('attendance.closed')}</p>
                </div>
            )}
            {warn && (
                <div role="status" className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                    <p>{t('attendance.supervision.warning', { count: shown.minorsPresent || shown.entries.filter((e) => e.isMinor && e.status === 'anwesend').length })}</p>
                </div>
            )}
            {!shown.canWrite && <p className="text-muted-foreground">{t('attendance.readonly')}</p>}
            {needsReason && shown.canWrite && (
                <div>
                    <label htmlFor="att-reason" className={labelClass}>
                        {t('attendance.reason')}
                    </label>
                    <input id="att-reason" type="text" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
                    <p className="mt-1 text-xs text-muted-foreground">{t('attendance.reason.hint')}</p>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
                <p aria-live="polite" className="text-foreground">
                    {t('attendance.summary', { present: shown.summary.anwesend, excused: shown.summary.entschuldigt, unexcused: shown.summary.unentschuldigt, open: shown.summary.offen })}
                </p>
                {shown.canWrite && !locked && (
                    <button
                        type="button"
                        disabled={!canEdit || shown.summary.offen === 0}
                        onClick={() => {
                            for (const e of shown.entries) if (e.status === null) setStatus(e, 'anwesend');
                        }}
                        className={`${secondaryBtn} inline-flex items-center gap-1.5`}
                    >
                        <CheckCheck className="h-4 w-4" aria-hidden />
                        {t('attendance.allPresent')}
                    </button>
                )}
            </div>

            {shown.entries.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground">{t('attendance.empty')}</p>
            ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                    {shown.entries.map((e) => (
                        <li key={e.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                            <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">{e.displayName}</p>
                                <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                                    {e.guestName && <span>{t('attendance.badge.guest')}</span>}
                                    {e.isMinor && <span>{t('attendance.badge.minor')}</span>}
                                    {e.prefilled && <span>{t('attendance.badge.absence')}</span>}
                                    {e.rsvp === 'angemeldet' && <span>{t('attendance.badge.rsvp')}</span>}
                                    {e.rsvp === 'warteliste' && <span>{t('attendance.badge.waitlist')}</span>}
                                    {!e.onRoster && !e.guestName && <span>{t('attendance.badge.added')}</span>}
                                </p>
                            </div>
                            <div role="group" aria-label={t('attendance.row.label', { name: e.displayName })} className="inline-flex overflow-hidden rounded-lg border border-border">
                                {ATTENDANCE_STATUSES.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        aria-pressed={e.status === s}
                                        disabled={!canEdit}
                                        onClick={() => setStatus(e, toggledStatus(e.status, s))}
                                        className={`px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${e.status === s ? STATUS_STYLE[s] : 'bg-background text-foreground hover:bg-muted'}`}
                                    >
                                        {t(`attendance.status.${s}`)}
                                    </button>
                                ))}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <div aria-live="polite" className="min-h-5 text-xs text-muted-foreground">
                {saveState === 'saving' && t('attendance.save.saving')}
                {saveState === 'saved' && !unsaved && t('attendance.save.saved')}
                {saveState === 'error' && (
                    <span className="text-destructive">
                        {t('attendance.save.error')}{' '}
                        <button type="button" onClick={() => void flush()} className="font-semibold underline">
                            {t('common.retry')}
                        </button>
                    </span>
                )}
            </div>
            {error && (
                <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
                    {error}
                </p>
            )}

            {shown.canWrite && !locked && (
                <>
                    <section className="space-y-3 rounded-lg border border-border p-3">
                        <h3 className="flex items-center gap-2 font-semibold text-foreground">
                            <UserPlus className="h-4 w-4" aria-hidden />
                            {t('attendance.add.title')}
                        </h3>
                        <MemberPicker clubId={clubId} label={t('attendance.add.member')} exclude={takenMembers} disabled={!canEdit} onPick={(m) => void addPerson({ clubMemberId: m.id, status: 'anwesend' })} />
                        <form
                            className="flex flex-wrap items-end gap-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const name = guestName.trim();
                                if (!name) return;
                                void addPerson({ guestName: name, status: 'anwesend' }).then((ok) => {
                                    if (ok) setGuestName('');
                                });
                            }}
                        >
                            <div className="min-w-48 flex-1">
                                <label htmlFor="att-guest" className={labelClass}>
                                    {t('attendance.add.guest')}
                                </label>
                                <input id="att-guest" type="text" maxLength={120} value={guestName} disabled={!canEdit} onChange={(e) => setGuestName(e.target.value)} className={inputClass} />
                            </div>
                            <button type="submit" disabled={!canEdit || !guestName.trim()} className={secondaryBtn}>
                                {t('attendance.add.guest.submit')}
                            </button>
                        </form>
                        <p className="text-xs text-muted-foreground">{t('attendance.add.hint')}</p>
                    </section>

                    <section className="space-y-2 rounded-lg border border-border p-3">
                        <h3 className="font-semibold text-foreground">{t('attendance.supervisors.title')}</h3>
                        {shown.supervisors.length === 0 ? (
                            <p className="text-muted-foreground">{t('attendance.supervisors.none')}</p>
                        ) : (
                            <ul className="flex flex-wrap gap-2">
                                {shown.supervisors.map((s) => (
                                    <li key={s.clubMemberId} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">
                                        {s.displayName}
                                        <button
                                            type="button"
                                            disabled={!canEdit}
                                            aria-label={t('attendance.supervisors.remove', { name: s.displayName })}
                                            onClick={() => void setSupervisors(shown.supervisors.filter((x) => x.clubMemberId !== s.clubMemberId).map((x) => x.clubMemberId))}
                                            className="font-bold text-muted-foreground hover:text-foreground"
                                        >
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {supervisorCandidates.length > 0 && (
                            <div className="flex flex-wrap items-end gap-2">
                                <div className="min-w-48 flex-1">
                                    <label htmlFor="att-supervisor" className={labelClass}>
                                        {t('attendance.supervisors.add')}
                                    </label>
                                    <select id="att-supervisor" value={supervisorPick} onChange={(e) => setSupervisorPick(e.target.value)} className={inputClass}>
                                        <option value="">—</option>
                                        {supervisorCandidates.map((c) => (
                                            <option key={c.key} value={c.clubMemberId!}>
                                                {c.displayName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    disabled={!canEdit || !supervisorPick}
                                    onClick={() => {
                                        void setSupervisors([...shown.supervisors.map((s) => s.clubMemberId), supervisorPick]);
                                        setSupervisorPick('');
                                    }}
                                    className={secondaryBtn}
                                >
                                    {t('attendance.supervisors.add.submit')}
                                </button>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">{t('attendance.supervisors.hint')}</p>
                    </section>

                    {!shown.closed && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                disabled={unsaved || saveState === 'saving'}
                                onClick={() => {
                                    setMarkOpen(false);
                                    setClosing(true);
                                }}
                                className={primaryBtn}
                            >
                                {t('attendance.close')}
                            </button>
                        </div>
                    )}
                </>
            )}

            {shown.corrections.length > 0 && (
                <section>
                    <h3 className="font-semibold text-foreground">{t('attendance.corrections.title')}</h3>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {shown.corrections.map((c, i) => (
                            <li key={i}>
                                {new Date(c.changedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })} · {c.displayName ?? '—'}:{' '}
                                {c.oldStatus ? t(`attendance.status.${c.oldStatus}`) : t('attendance.status.open')} → {c.newStatus ? t(`attendance.status.${c.newStatus}`) : t('attendance.status.open')} ({c.reason})
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <Modal
                open={closing}
                onClose={() => setClosing(false)}
                title={t('attendance.close.title')}
                footer={
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setClosing(false)} className={secondaryBtn}>
                            {t('kalender.cancel')}
                        </button>
                        <button type="button" onClick={() => void closeList()} className={primaryBtn}>
                            {t('attendance.close.confirm')}
                        </button>
                    </div>
                }
            >
                <div className="space-y-3 text-sm text-foreground">
                    <p>{t('attendance.close.body')}</p>
                    {shown.summary.offen > 0 && <Toggle checked={markOpen} onChange={setMarkOpen} label={t('attendance.close.markOpen', { count: shown.summary.offen })} />}
                </div>
            </Modal>
        </div>
    );
}
