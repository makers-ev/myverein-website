'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { useConfirm } from '@/components/useConfirm';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { eventErrorKey } from '@/lib/eventErrors';
import { type Candidate, type Shift, type Station, shiftBody, shiftProblem, sortCandidates } from '@/lib/helperPlan';

import { type CalendarEvent, inputClass, labelClass, primaryBtn, secondaryBtn, toLocalInput } from './calendarTypes';

interface AddProps {
    mode: 'station' | 'shift';
    clubId: string;
    eventId: string;
    stationId?: string;
    event: CalendarEvent;
    onChanged: () => void;
}

/** Inline "Station hinzufügen" / "Schicht hinzufügen" forms of the plan editor (`helpers:write`, the server enforces the department scope). */
export default function HelperManage({ mode, clubId, eventId, stationId, event, onChanged }: AddProps) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startsAt, setStartsAt] = useState(toLocalInput(new Date(event.startsAt)));
    const [endsAt, setEndsAt] = useState(toLocalInput(new Date(event.endsAt ?? new Date(event.startsAt).getTime() + 2 * 3600_000)));
    const [capacity, setCapacity] = useState('2');
    const [minStaff, setMinStaff] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const problem = mode === 'shift' ? shiftProblem(startsAt, endsAt, capacity, minStaff) : null;
    const base = `/events/${eventId}/helpers`;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (problem) return;
        setBusy(true);
        setError(null);
        try {
            if (mode === 'station') await apiFetch(`${base}/stations?clubId=${clubId}`, { method: 'POST', body: { name: name.trim(), ...(description.trim() ? { description: description.trim() } : {}) } });
            else await apiFetch(`${base}/stations/${stationId}/shifts?clubId=${clubId}`, { method: 'POST', body: shiftBody(startsAt, endsAt, capacity, minStaff) });
            setOpen(false);
            setName('');
            setDescription('');
            onChanged();
        } catch (err) {
            setError(t(eventErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    if (!open) {
        return (
            <div className={mode === 'shift' ? 'border-t border-border px-3 py-2' : ''}>
                <button type="button" onClick={() => setOpen(true)} className={`${secondaryBtn} inline-flex items-center gap-1.5`}>
                    <Plus className="h-4 w-4" aria-hidden />
                    {t(mode === 'station' ? 'helpers.manage.addStation' : 'helpers.manage.addShift')}
                </button>
            </div>
        );
    }
    const idp = `${mode}-${stationId ?? 'new'}`;
    return (
        <form onSubmit={(e) => void submit(e)} className={`space-y-3 rounded-lg border border-border p-3 ${mode === 'shift' ? 'm-3' : ''}`}>
            {mode === 'station' ? (
                <>
                    <div>
                        <label htmlFor={`${idp}-name`} className={labelClass}>
                            {t('helpers.manage.station.name')} *
                        </label>
                        <input id={`${idp}-name`} type="text" required autoFocus maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('helpers.manage.station.placeholder')} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor={`${idp}-desc`} className={labelClass}>
                            {t('helpers.manage.station.description')}
                        </label>
                        <input id={`${idp}-desc`} type="text" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
                    </div>
                </>
            ) : (
                <ShiftFields idp={idp} startsAt={startsAt} endsAt={endsAt} capacity={capacity} minStaff={minStaff} setStartsAt={setStartsAt} setEndsAt={setEndsAt} setCapacity={setCapacity} setMinStaff={setMinStaff} problem={problem} />
            )}
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            <div className="flex gap-2">
                <button type="submit" disabled={busy || problem !== null || (mode === 'station' && !name.trim())} className={primaryBtn}>
                    {t('helpers.manage.add')}
                </button>
                <button type="button" onClick={() => setOpen(false)} className={secondaryBtn}>
                    {t('kalender.cancel')}
                </button>
            </div>
        </form>
    );
}

function ShiftFields(props: {
    idp: string;
    startsAt: string;
    endsAt: string;
    capacity: string;
    minStaff: string;
    setStartsAt: (v: string) => void;
    setEndsAt: (v: string) => void;
    setCapacity: (v: string) => void;
    setMinStaff: (v: string) => void;
    problem: ReturnType<typeof shiftProblem>;
}) {
    const { t } = useLanguage();
    const { idp, problem } = props;
    return (
        <>
            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <label htmlFor={`${idp}-start`} className={labelClass}>
                        {t('helpers.manage.shift.start')} *
                    </label>
                    <input id={`${idp}-start`} type="datetime-local" required value={props.startsAt} onChange={(e) => props.setStartsAt(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label htmlFor={`${idp}-end`} className={labelClass}>
                        {t('helpers.manage.shift.end')} *
                    </label>
                    <input id={`${idp}-end`} type="datetime-local" required value={props.endsAt} onChange={(e) => props.setEndsAt(e.target.value)} aria-invalid={problem === 'order' || problem === 'range'} className={inputClass} />
                </div>
                <div>
                    <label htmlFor={`${idp}-cap`} className={labelClass}>
                        {t('helpers.manage.shift.capacity')} *
                    </label>
                    <input id={`${idp}-cap`} type="number" min={1} max={500} required value={props.capacity} onChange={(e) => props.setCapacity(e.target.value)} aria-invalid={problem === 'capacity'} className={inputClass} />
                </div>
                <div>
                    <label htmlFor={`${idp}-min`} className={labelClass}>
                        {t('helpers.manage.shift.minStaff')}
                    </label>
                    <input id={`${idp}-min`} type="number" min={0} max={500} value={props.minStaff} onChange={(e) => props.setMinStaff(e.target.value)} aria-invalid={problem === 'minStaff'} className={inputClass} />
                </div>
            </div>
            {problem && (
                <p role="alert" className="text-xs text-destructive">
                    {t(`helpers.manage.problem.${problem}`)}
                </p>
            )}
            <p className="text-xs text-muted-foreground">{t('helpers.manage.shift.hint')}</p>
        </>
    );
}

/** Rename / delete a station. */
export function StationEditor({ clubId, eventId, station, onChanged }: { clubId: string; eventId: string; station: Station; onChanged: () => void }) {
    const { t } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(station.name);
    const [error, setError] = useState<string | null>(null);
    const url = `/events/${eventId}/helpers/stations/${station.id}?clubId=${clubId}`;

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        try {
            await apiFetch(url, { method: 'PATCH', body: { name: name.trim() } });
            setEditing(false);
            onChanged();
        } catch (err) {
            setError(t(eventErrorKey(err)));
        }
    }

    async function remove() {
        if (!(await confirm({ title: t('helpers.manage.station.delete'), body: t('helpers.manage.station.delete.body', { name: station.name }), confirmLabel: t('helpers.manage.station.delete'), danger: true }))) return;
        try {
            await apiFetch(url, { method: 'DELETE' });
            onChanged();
        } catch (err) {
            setError(t(eventErrorKey(err)));
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {editing ? (
                <form onSubmit={(e) => void save(e)} className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`st-${station.id}`}>
                        {t('helpers.manage.station.name')}
                    </label>
                    <input id={`st-${station.id}`} type="text" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} !py-1`} />
                    <button type="submit" disabled={!name.trim()} className={`${primaryBtn} !px-3 !py-1 text-xs`}>
                        {t('kalender.save')}
                    </button>
                    <button type="button" onClick={() => setEditing(false)} className={`${secondaryBtn} !px-3 !py-1 text-xs`}>
                        {t('kalender.cancel')}
                    </button>
                </form>
            ) : (
                <>
                    <button type="button" onClick={() => setEditing(true)} className={`${secondaryBtn} !px-3 !py-1 text-xs`}>
                        {t('helpers.manage.rename')}
                    </button>
                    <button type="button" onClick={() => void remove()} className="rounded-lg border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10">
                        {t('helpers.manage.station.delete')}
                    </button>
                </>
            )}
            {error && (
                <p role="alert" className="w-full text-xs text-destructive">
                    {error}
                </p>
            )}
            {dialog}
        </div>
    );
}

/** Edit/delete a shift and show availability hints for filling it. */
export function ShiftEditor({ clubId, eventId, shift, onChanged, onSignUp }: { clubId: string; eventId: string; shift: Shift; onChanged: () => void; onSignUp: (clubMemberId: string) => Promise<void> }) {
    const { t } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [mode, setMode] = useState<'closed' | 'edit' | 'suggest'>('closed');
    const [startsAt, setStartsAt] = useState(toLocalInput(new Date(shift.startsAt)));
    const [endsAt, setEndsAt] = useState(toLocalInput(new Date(shift.endsAt)));
    const [capacity, setCapacity] = useState(String(shift.capacity));
    const [minStaff, setMinStaff] = useState(String(shift.minStaff));
    const [error, setError] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<Candidate[] | 'loading' | 'error' | null>(null);
    const problem = mode === 'edit' ? shiftProblem(startsAt, endsAt, capacity, minStaff) : null;
    const url = `/events/${eventId}/helpers/shifts/${shift.id}?clubId=${clubId}`;

    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (problem) return;
        setError(null);
        try {
            await apiFetch(url, { method: 'PATCH', body: shiftBody(startsAt, endsAt, capacity, minStaff) });
            setMode('closed');
            onChanged();
        } catch (err) {
            setError(t(eventErrorKey(err)));
        }
    }

    async function remove() {
        if (!(await confirm({ title: t('helpers.manage.shift.delete'), body: t('helpers.manage.shift.delete.body', { count: shift.filled }), confirmLabel: t('helpers.manage.shift.delete'), danger: true }))) return;
        try {
            await apiFetch(url, { method: 'DELETE' });
            onChanged();
        } catch (err) {
            setError(t(eventErrorKey(err)));
        }
    }

    async function loadSuggestions() {
        setMode('suggest');
        setCandidates('loading');
        try {
            const res = await apiFetch<{ data: { shifts: Array<{ shiftId: string; candidates: Candidate[] }> } }>(`/events/${eventId}/helpers/suggestions?clubId=${clubId}`);
            setCandidates(sortCandidates(res.data.shifts.find((s) => s.shiftId === shift.id)?.candidates ?? []));
        } catch {
            setCandidates('error');
        }
    }

    return (
        <div className="space-y-2 border-t border-dashed border-border pt-2">
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setMode(mode === 'edit' ? 'closed' : 'edit')} aria-expanded={mode === 'edit'} className={`${secondaryBtn} !px-3 !py-1 text-xs`}>
                    {t('helpers.manage.shift.edit')}
                </button>
                <button type="button" onClick={() => (mode === 'suggest' ? setMode('closed') : void loadSuggestions())} aria-expanded={mode === 'suggest'} className={`${secondaryBtn} !px-3 !py-1 text-xs`}>
                    {t('helpers.manage.suggest')}
                </button>
                <button type="button" onClick={() => void remove()} className="rounded-lg border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10">
                    {t('helpers.manage.shift.delete')}
                </button>
            </div>
            {mode === 'edit' && (
                <form onSubmit={(e) => void save(e)} className="space-y-3 rounded-lg border border-border p-3">
                    <ShiftFields idp={`edit-${shift.id}`} startsAt={startsAt} endsAt={endsAt} capacity={capacity} minStaff={minStaff} setStartsAt={setStartsAt} setEndsAt={setEndsAt} setCapacity={setCapacity} setMinStaff={setMinStaff} problem={problem} />
                    <button type="submit" disabled={problem !== null} className={primaryBtn}>
                        {t('kalender.save')}
                    </button>
                </form>
            )}
            {mode === 'suggest' && (
                <div className="rounded-lg border border-border p-3">
                    <p className="mb-2 text-xs text-muted-foreground">{t('helpers.manage.suggest.hint')}</p>
                    {candidates === 'loading' || candidates === null ? (
                        <LoadingText />
                    ) : candidates === 'error' ? (
                        <LoadError onRetry={() => void loadSuggestions()} />
                    ) : candidates.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('helpers.manage.suggest.none')}</p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {candidates.map((c) => (
                                <li key={c.clubMemberId} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                                    <span className="min-w-0 text-sm text-foreground">
                                        {c.displayName}
                                        <span className="block text-xs text-muted-foreground">
                                            {t(`helpers.avail.${c.availability}`)}
                                            {c.isMinor ? ` · ${t('attendance.badge.minor')}` : ''}
                                            {c.alreadyOnShift ? ` · ${t('helpers.manage.suggest.on')}` : ''}
                                            {c.conflicting ? ` · ${t('helpers.manage.suggest.conflict')}` : ''}
                                        </span>
                                    </span>
                                    <button type="button" disabled={c.alreadyOnShift} onClick={() => void onSignUp(c.clubMemberId)} className={`${secondaryBtn} !px-3 !py-1 text-xs`}>
                                        {t('helpers.manage.suggest.add')}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            {error && (
                <p role="alert" className="text-xs text-destructive">
                    {error}
                </p>
            )}
            {dialog}
        </div>
    );
}
