'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Toggle } from '@/components/standorte/ui';
import { apiFetch } from '@/lib/api-client';

import { type TFn, errorMessage, inputClass, labelClass } from './calendarTypes';
import { type RuleState, type SeriesPreview, WEEKDAYS, type Weekday, setPosOf, weekdayOf } from './eventSeries';

interface Props {
    rule: RuleState;
    onChange: (rule: RuleState) => void;
    /** Local `YYYY-MM-DD` of the first occurrence. */
    startDate: string;
    clubId: string;
    language: string;
    t: TFn;
    /** Body for `POST /event-series/preview`; `null` while the form is not valid yet. */
    previewBody?: Record<string, unknown> | null;
}

/** Recurrence editor: frequency, interval, weekdays, end, holidays and a preview of the next dates. */
export default function SeriesRuleFields({ rule, onChange, startDate, clubId, language, t, previewBody }: Props) {
    const set = (patch: Partial<RuleState>) => onChange({ ...rule, ...patch });
    const [preview, setPreview] = useState<SeriesPreview | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [stateKnown, setStateKnown] = useState<boolean | null>(null);
    const bodyKey = previewBody ? JSON.stringify(previewBody) : null;

    useEffect(() => {
        if (!bodyKey) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPreview(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setPreviewError(null);
        const timer = window.setTimeout(() => {
            apiFetch<{ data: SeriesPreview }>(`/event-series/preview?clubId=${clubId}&limit=6`, { method: 'POST', body: JSON.parse(bodyKey) })
                .then((res) => !cancelled && setPreview(res.data))
                .catch((err) => !cancelled && (setPreview(null), setPreviewError(errorMessage(err, t))))
                .finally(() => !cancelled && setLoading(false));
        }, 400);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bodyKey, clubId]);

    useEffect(() => {
        if (!rule.skipHolidays || stateKnown !== null) return;
        apiFetch<{ data: { state?: string | null } }>(`/club-settings?clubId=${clubId}`)
            .then((res) => setStateKnown(Boolean(res.data.state)))
            .catch(() => setStateKnown(null));
    }, [rule.skipHolidays, stateKnown, clubId]);

    const weekdayLabel = (d: Weekday) => new Date(2024, 0, 1 + WEEKDAYS.indexOf(d)).toLocaleDateString(language, { weekday: 'short' });
    const weekdayLong = (d: Weekday) => new Date(2024, 0, 1 + WEEKDAYS.indexOf(d)).toLocaleDateString(language, { weekday: 'long' });
    const unit = rule.freq === 'daily' ? 'day' : rule.freq === 'weekly' ? 'week' : 'month';
    const nth = startDate ? setPosOf(startDate) : 1;

    return (
        <div className="space-y-4 rounded-lg border border-border p-3">
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="sr-freq" className={labelClass}>
                        {t('kalender.series.freq')}
                    </label>
                    <select id="sr-freq" value={rule.freq} onChange={(e) => set({ freq: e.target.value as RuleState['freq'], byDay: e.target.value === 'weekly' && rule.byDay.length === 0 && startDate ? [weekdayOf(startDate)] : rule.byDay })} className={inputClass}>
                        {(['daily', 'weekly', 'monthly'] as const).map((f) => (
                            <option key={f} value={f}>
                                {t(`kalender.series.freq.${f}`)}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="sr-interval" className={labelClass}>
                        {t(`kalender.series.every.${unit}`)}
                    </label>
                    <input id="sr-interval" type="number" min={1} max={99} step={1} value={rule.interval} onChange={(e) => set({ interval: e.target.value })} className={inputClass} />
                </div>
            </div>

            {rule.freq === 'weekly' && (
                <fieldset>
                    <legend className={labelClass}>{t('kalender.series.weekdays')}</legend>
                    <div className="flex flex-wrap gap-1.5">
                        {WEEKDAYS.map((d) => {
                            const on = rule.byDay.includes(d);
                            return (
                                <button
                                    key={d}
                                    type="button"
                                    aria-pressed={on}
                                    aria-label={weekdayLong(d)}
                                    onClick={() => set({ byDay: on ? rule.byDay.filter((x) => x !== d) : [...rule.byDay, d] })}
                                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-muted'}`}
                                >
                                    {weekdayLabel(d)}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>
            )}

            {rule.freq === 'monthly' && startDate && (
                <div>
                    <label htmlFor="sr-monthly" className={labelClass}>
                        {t('kalender.series.monthly.mode')}
                    </label>
                    <select id="sr-monthly" value={rule.monthlyMode} onChange={(e) => set({ monthlyMode: e.target.value as RuleState['monthlyMode'] })} className={inputClass}>
                        <option value="dayOfMonth">{t('kalender.series.monthly.day', { day: Number(startDate.slice(8, 10)) })}</option>
                        <option value="nthWeekday">
                            {t(nth === -1 ? 'kalender.series.monthly.last' : 'kalender.series.monthly.nth', { n: nth, weekday: weekdayLong(weekdayOf(startDate)) })}
                        </option>
                    </select>
                    {rule.monthlyMode === 'dayOfMonth' && Number(startDate.slice(8, 10)) > 28 && (
                        <p className="mt-1 text-xs text-muted-foreground">{t('kalender.series.monthly.skip-hint')}</p>
                    )}
                </div>
            )}

            <fieldset>
                <legend className={labelClass}>{t('kalender.series.end')}</legend>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground">
                    {(['never', 'until', 'count'] as const).map((m) => (
                        <label key={m} className="inline-flex items-center gap-1.5">
                            <input type="radio" name="sr-end" checked={rule.endMode === m} onChange={() => set({ endMode: m })} />
                            {t(`kalender.series.end.${m}`)}
                        </label>
                    ))}
                </div>
                {rule.endMode === 'until' && (
                    <input type="date" aria-label={t('kalender.series.end.until')} min={startDate} value={rule.untilDate} onChange={(e) => set({ untilDate: e.target.value })} className={`${inputClass} mt-2 sm:max-w-xs`} />
                )}
                {rule.endMode === 'count' && (
                    <input type="number" aria-label={t('kalender.series.end.count')} min={1} max={1000} step={1} value={rule.count} onChange={(e) => set({ count: e.target.value })} className={`${inputClass} mt-2 sm:max-w-xs`} />
                )}
                {rule.endMode === 'never' && <p className="mt-1 text-xs text-muted-foreground">{t('kalender.series.end.never.hint')}</p>}
            </fieldset>

            <div className="space-y-1">
                <Toggle checked={rule.skipHolidays} onChange={(v) => set({ skipHolidays: v })} label={t('kalender.series.holidays')} />
                {rule.skipHolidays && stateKnown === false && (
                    <p className="text-xs text-muted-foreground">
                        {t('kalender.series.holidays.no-state')}{' '}
                        <Link href="/verein" className="font-semibold text-primary underline">
                            {t('kalender.series.holidays.set-state')}
                        </Link>
                    </p>
                )}
            </div>

            {previewBody !== undefined && (
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm" aria-live="polite">
                <p className="font-semibold text-foreground">{t('kalender.series.preview.title')}</p>
                {!previewBody ? (
                    <p className="text-muted-foreground">{t('kalender.series.preview.incomplete')}</p>
                ) : previewError ? (
                    <p role="alert" className="text-destructive">
                        {previewError}
                    </p>
                ) : loading && !preview ? (
                    <p role="status" className="text-muted-foreground">
                        {t('kalender.series.preview.loading')}
                    </p>
                ) : preview ? (
                    preview.occurrences.length === 0 ? (
                        <p className="text-muted-foreground">{t('kalender.series.preview.none')}</p>
                    ) : (
                        <>
                            <ul className="mt-1 space-y-0.5 text-foreground">
                                {preview.occurrences.map((o) => (
                                    <li key={o.startsAt}>{new Date(`${o.localDate}T00:00`).toLocaleDateString(language, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</li>
                                ))}
                                {!preview.finished && <li className="text-muted-foreground">…</li>}
                            </ul>
                            {preview.skippedHolidays.length > 0 && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t('kalender.series.preview.skipped', { list: preview.skippedHolidays.map((h) => `${new Date(`${h.localDate}T00:00`).toLocaleDateString(language, { day: 'numeric', month: 'numeric' })} ${h.holiday}`).join(', ') })}
                                </p>
                            )}
                        </>
                    )
                ) : null}
            </div>
            )}
        </div>
    );
}
