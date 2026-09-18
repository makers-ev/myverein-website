'use client';

import { useEffect, useState } from 'react';

import { apiFetch, ApiError } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';

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
    const { t } = useLanguage();
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
                    <div className="rounded-xl border border-border bg-card p-4">
                        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
                        <table className="w-full text-sm">
                            <tbody>
                                {WEEKDAY_KEYS.map((key, day) => {
                                    const row = rows[day] ?? DEFAULT_ROW;
                                    return (
                                        <tr key={key} className="border-b border-border last:border-b-0">
                                            <td className="w-40 px-2 py-2.5 font-medium text-foreground">{t(`verfuegbarkeit.weekday.${key}`)}</td>
                                            <td className="px-2 py-2.5">
                                                <input
                                                    type="checkbox"
                                                    checked={row.available}
                                                    onChange={(e) => void handleToggle(day, e.target.checked)}
                                                />
                                            </td>
                                            <td className="px-2 py-2.5">
                                                {row.available && (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="time"
                                                            value={row.startTime}
                                                            onChange={(e) => setRows((prev) => ({ ...prev, [day]: { ...(prev[day] ?? DEFAULT_ROW), startTime: e.target.value } }))}
                                                            onBlur={() => void handleTimeBlur(day)}
                                                            className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                                                        />
                                                        <span className="text-muted-foreground">–</span>
                                                        <input
                                                            type="time"
                                                            value={row.endTime}
                                                            onChange={(e) => setRows((prev) => ({ ...prev, [day]: { ...(prev[day] ?? DEFAULT_ROW), endTime: e.target.value } }))}
                                                            onBlur={() => void handleTimeBlur(day)}
                                                            className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4">
                        <h2 className="mb-3 text-sm font-bold text-foreground">{t('verfuegbarkeit.exceptions.title')}</h2>

                        {exceptions.length === 0 ? (
                            <p className="mb-3 text-sm text-muted-foreground">{t('verfuegbarkeit.exceptions.empty')}</p>
                        ) : (
                            <ul className="mb-3 space-y-2">
                                {exceptions.map((exc) => (
                                    <li key={exc.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                                        <span className="text-foreground">
                                            {exc.date} — {t(exc.isAvailable ? 'verfuegbarkeit.exceptions.available' : 'verfuegbarkeit.exceptions.unavailable')}
                                            {exc.note ? ` (${exc.note})` : ''}
                                        </span>
                                        <button onClick={() => void handleDeleteException(exc.id)} className="text-xs text-destructive hover:underline">
                                            {t('verfuegbarkeit.exceptions.remove')}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="date"
                                value={excDate}
                                onChange={(e) => setExcDate(e.target.value)}
                                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                            <select
                                value={excAvailable ? 'available' : 'unavailable'}
                                onChange={(e) => setExcAvailable(e.target.value === 'available')}
                                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                                <option value="available">{t('verfuegbarkeit.exceptions.available')}</option>
                                <option value="unavailable">{t('verfuegbarkeit.exceptions.unavailable')}</option>
                            </select>
                            <input
                                type="text"
                                value={excNote}
                                onChange={(e) => setExcNote(e.target.value)}
                                placeholder={t('verfuegbarkeit.exceptions.note')}
                                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                            />
                            <button
                                onClick={() => void handleAddException()}
                                disabled={!excDate}
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                            >
                                {t('verfuegbarkeit.exceptions.add')}
                            </button>
                        </div>
                        {excError && <p className="mt-2 text-sm text-destructive">{excError}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
