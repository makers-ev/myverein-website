'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';

import { apiFetch, ApiError } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { inputClass, labelClass, primaryBtn } from '@/components/kalender/calendarTypes';

interface MyClub {
    clubId: string;
    memberId: string;
    clubName: string | null;
    orgRole: string;
}

interface AvailabilitySlot {
    id: string;
    memberId: string;
    weekday: number;
    startTime: string;
    endTime: string;
}

interface AvailabilityException {
    id: string;
    memberId: string;
    date: string;
    isAvailable: boolean;
    note: string | null;
}

const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

interface RowState {
    available: boolean;
    startTime: string;
    endTime: string;
}

const DEFAULT_ROW: RowState = { available: false, startTime: '18:00', endTime: '20:00' };

export default function VerfuegbarkeitPageContent() {
    const { t, language } = useLanguage();
    const [clubs, setClubs] = useState<MyClub[] | null>(null);
    const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
    const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
    const [rows, setRows] = useState<Record<number, RowState>>({});
    const [initialized, setInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeClub = clubs?.[0] ?? null;

    useEffect(() => {
        void apiFetch<{ data: MyClub[] }>('/my-clubs').then(({ data }) => setClubs(data));
    }, []);

    async function refresh(clubId: string) {
        const [slotsRes, exceptionsRes] = await Promise.all([
            apiFetch<{ data: AvailabilitySlot[] }>(`/availability/slots?clubId=${clubId}`),
            apiFetch<{ data: AvailabilityException[] }>(`/availability/exceptions?clubId=${clubId}`),
        ]);
        setSlots(slotsRes.data);
        setExceptions(exceptionsRes.data);
    }

    useEffect(() => {
        if (!activeClub) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refresh(activeClub.clubId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeClub?.clubId]);

    useEffect(() => {
        if (!clubs || initialized) return;
        const next: Record<number, RowState> = {};
        for (let day = 0; day < 7; day++) {
            const slot = slots.find((s) => s.weekday === day);
            next[day] = slot ? { available: true, startTime: slot.startTime.slice(0, 5), endTime: slot.endTime.slice(0, 5) } : { ...DEFAULT_ROW };
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRows(next);
        setInitialized(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubs, slots]);

    async function upsertSlot(day: number, startTime: string, endTime: string) {
        if (!activeClub) return;
        const existing = slots.find((s) => s.weekday === day);
        if (existing) {
            await apiFetch(`/availability/slots/${existing.id}?clubId=${activeClub.clubId}`, { method: 'PATCH', body: { startTime, endTime } });
        } else {
            await apiFetch(`/availability/slots?clubId=${activeClub.clubId}`, { method: 'POST', body: { weekday: day, startTime, endTime } });
        }
        await refresh(activeClub.clubId);
    }

    async function deleteSlot(day: number) {
        if (!activeClub) return;
        const existing = slots.find((s) => s.weekday === day);
        if (!existing) return;
        await apiFetch(`/availability/slots/${existing.id}?clubId=${activeClub.clubId}`, { method: 'DELETE' });
        await refresh(activeClub.clubId);
    }

    async function handleToggle(day: number, value: boolean) {
        const row = rows[day] ?? DEFAULT_ROW;
        setRows((prev) => ({ ...prev, [day]: { ...row, available: value } }));
        setError(null);
        try {
            if (value) {
                await upsertSlot(day, `${row.startTime || DEFAULT_ROW.startTime}:00`, `${row.endTime || DEFAULT_ROW.endTime}:00`);
            } else {
                await deleteSlot(day);
            }
        } catch (err) {
            setRows((prev) => ({ ...prev, [day]: { ...row, available: !value } }));
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    async function handleTimeBlur(day: number) {
        const row = rows[day];
        if (!row?.available || !row.startTime || !row.endTime) return;
        setError(null);
        try {
            await upsertSlot(day, `${row.startTime}:00`, `${row.endTime}:00`);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    const [excDate, setExcDate] = useState('');
    const [excAvailable, setExcAvailable] = useState(true);
    const [excNote, setExcNote] = useState('');
    const [excError, setExcError] = useState<string | null>(null);

    async function handleAddException() {
        if (!activeClub || !excDate) return;
        setExcError(null);
        try {
            await apiFetch(`/availability/exceptions?clubId=${activeClub.clubId}`, {
                method: 'POST',
                body: { date: excDate, isAvailable: excAvailable, ...(excNote.trim() ? { note: excNote.trim() } : {}) },
            });
            setExcDate('');
            setExcNote('');
            setExcAvailable(true);
            await refresh(activeClub.clubId);
        } catch (err) {
            setExcError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    async function handleDeleteException(id: string) {
        if (!activeClub) return;
        setExcError(null);
        try {
            await apiFetch(`/availability/exceptions/${id}?clubId=${activeClub.clubId}`, { method: 'DELETE' });
            await refresh(activeClub.clubId);
        } catch (err) {
            setExcError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-foreground">{t('verfuegbarkeit.page.title')}</h1>

            {clubs === null ? (
                <p className="mt-6 text-sm text-muted-foreground">…</p>
            ) : !activeClub ? (
                <div className="mt-6 rounded-xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">{t('verein.no-club.title')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t('verein.no-club.body')}</p>
                </div>
            ) : (
                <div className="mt-6 space-y-4">
                    <section className="rounded-xl border border-border bg-card p-4">
                        <h2 className="text-sm font-bold text-foreground">{t('verfuegbarkeit.weekly.title')}</h2>
                        <p className="mb-3 mt-0.5 text-xs text-muted-foreground">{t('verfuegbarkeit.weekly.hint')}</p>
                        {error && (
                            <p role="alert" className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {error}
                            </p>
                        )}

                        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                            {WEEKDAY_KEYS.map((key, day) => {
                                const row = rows[day] ?? DEFAULT_ROW;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        aria-pressed={row.available}
                                        aria-label={t(`verfuegbarkeit.weekday.${key}`)}
                                        onClick={() => void handleToggle(day, !row.available)}
                                        className={`flex min-h-16 flex-col items-center justify-center rounded-lg border px-1 py-2 text-center transition-colors ${
                                            row.available
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-border bg-background text-muted-foreground hover:bg-muted'
                                        }`}
                                    >
                                        <span className="text-xs font-bold uppercase sm:text-sm">{t(`verfuegbarkeit.weekday.${key}`).slice(0, 2)}</span>
                                        <span className="mt-1 hidden text-[10px] tabular-nums sm:block">
                                            {row.available ? `${row.startTime}–${row.endTime}` : '—'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {WEEKDAY_KEYS.some((_, day) => rows[day]?.available) && (
                            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
                                {WEEKDAY_KEYS.map((key, day) => {
                                    const row = rows[day];
                                    if (!row?.available) return null;
                                    const setTime = (field: 'startTime' | 'endTime', value: string) =>
                                        setRows((prev) => ({ ...prev, [day]: { ...(prev[day] ?? DEFAULT_ROW), [field]: value } }));
                                    return (
                                        <li key={key} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                                            <span className="w-28 text-sm font-medium text-foreground">{t(`verfuegbarkeit.weekday.${key}`)}</span>
                                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                                {t('verfuegbarkeit.start-time')}
                                                <input
                                                    type="time"
                                                    value={row.startTime}
                                                    onChange={(e) => setTime('startTime', e.target.value)}
                                                    onBlur={() => void handleTimeBlur(day)}
                                                    className={`${inputClass} !w-auto !py-1.5`}
                                                />
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                                {t('verfuegbarkeit.end-time')}
                                                <input
                                                    type="time"
                                                    value={row.endTime}
                                                    onChange={(e) => setTime('endTime', e.target.value)}
                                                    onBlur={() => void handleTimeBlur(day)}
                                                    className={`${inputClass} !w-auto !py-1.5`}
                                                />
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    <section className="rounded-xl border border-border bg-card p-4">
                        <h2 className="mb-3 text-sm font-bold text-foreground">{t('verfuegbarkeit.exceptions.title')}</h2>

                        {exceptions.length === 0 ? (
                            <p className="mb-4 text-sm text-muted-foreground">{t('verfuegbarkeit.exceptions.empty')}</p>
                        ) : (
                            <ul className="mb-4 space-y-2">
                                {exceptions.map((exc) => (
                                    <li key={exc.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                                        <span className="w-28 font-medium tabular-nums text-foreground">
                                            {new Date(`${exc.date}T00:00`).toLocaleDateString(language, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </span>
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                exc.isAvailable ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                                            }`}
                                        >
                                            {t(exc.isAvailable ? 'verfuegbarkeit.exceptions.available' : 'verfuegbarkeit.exceptions.unavailable')}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-muted-foreground">{exc.note}</span>
                                        <button
                                            type="button"
                                            onClick={() => void handleDeleteException(exc.id)}
                                            aria-label={`${t('verfuegbarkeit.exceptions.remove')}: ${exc.date}`}
                                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="rounded-lg border border-border p-3">
                            <p className="mb-3 text-sm font-semibold text-foreground">{t('verfuegbarkeit.exceptions.add')}</p>
                            <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr]">
                                <div>
                                    <label htmlFor="exc-date" className={labelClass}>
                                        {t('verfuegbarkeit.exceptions.date')} *
                                    </label>
                                    <input id="exc-date" type="date" value={excDate} onChange={(e) => setExcDate(e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label htmlFor="exc-status" className={labelClass}>
                                        {t('verfuegbarkeit.exceptions.status')}
                                    </label>
                                    <select
                                        id="exc-status"
                                        value={excAvailable ? 'available' : 'unavailable'}
                                        onChange={(e) => setExcAvailable(e.target.value === 'available')}
                                        className={inputClass}
                                    >
                                        <option value="available">{t('verfuegbarkeit.exceptions.available')}</option>
                                        <option value="unavailable">{t('verfuegbarkeit.exceptions.unavailable')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="exc-note" className={labelClass}>
                                        {t('verfuegbarkeit.exceptions.note')}
                                    </label>
                                    <input id="exc-note" type="text" value={excNote} onChange={(e) => setExcNote(e.target.value)} className={inputClass} />
                                </div>
                            </div>
                            <button type="button" onClick={() => void handleAddException()} disabled={!excDate} className={`${primaryBtn} mt-3`}>
                                {t('verfuegbarkeit.exceptions.add')}
                            </button>
                            {excError && (
                                <p role="alert" className="mt-2 text-sm text-destructive">
                                    {excError}
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
