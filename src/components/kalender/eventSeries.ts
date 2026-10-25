import { dayKey } from './calendarTypes';

export type SeriesFreq = 'daily' | 'weekly' | 'monthly';
export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';
export type SeriesScope = 'this' | 'this_and_following' | 'all';
export type EndMode = 'never' | 'until' | 'count';
export type MonthlyMode = 'dayOfMonth' | 'nthWeekday';

export const WEEKDAYS: readonly Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

/** Editor state of the recurrence rule. */
export interface RuleState {
    freq: SeriesFreq;
    interval: string;
    byDay: Weekday[];
    monthlyMode: MonthlyMode;
    endMode: EndMode;
    untilDate: string;
    count: string;
    skipHolidays: boolean;
}

/** Server shape of `event_series` (the parts the editor needs). */
export interface EventSeries {
    id: string;
    calendarId: string;
    freq: SeriesFreq;
    intervalCount: number;
    byDay: Weekday[] | null;
    bySetPos: number | null;
    untilDate: string | null;
    count: number | null;
    skipHolidays: boolean;
    startDate: string;
}

export interface SeriesPreview {
    occurrences: { startsAt: string; endsAt: string | null; localDate: string }[];
    skippedHolidays: { localDate: string; holiday: string }[];
    finished: boolean;
}

/** Weekday code of a local `YYYY-MM-DD`. */
export function weekdayOf(date: string): Weekday {
    const [y, m, d] = date.split('-').map(Number);
    return WEEKDAYS[(new Date(y, m - 1, d).getDay() + 6) % 7]!;
}

/** n-th weekday of the month for `bySetPos`: 1-4, and -1 for the last (5th) one. */
export function setPosOf(date: string): number {
    const day = Number(date.split('-')[2]);
    const nth = Math.ceil(day / 7);
    return nth >= 5 ? -1 : nth;
}

export function defaultRule(startDate: string): RuleState {
    return { freq: 'weekly', interval: '1', byDay: startDate ? [weekdayOf(startDate)] : [], monthlyMode: 'dayOfMonth', endMode: 'never', untilDate: '', count: '10', skipHolidays: false };
}

export function ruleFromSeries(series: EventSeries): RuleState {
    return {
        freq: series.freq,
        interval: String(series.intervalCount),
        byDay: series.byDay ?? [],
        monthlyMode: series.freq === 'monthly' && series.bySetPos != null ? 'nthWeekday' : 'dayOfMonth',
        endMode: series.untilDate ? 'until' : series.count != null ? 'count' : 'never',
        untilDate: series.untilDate ?? '',
        count: series.count != null ? String(series.count) : '10',
        skipHolidays: series.skipHolidays,
    };
}

export function intervalValue(rule: RuleState): number | null {
    const n = Number(rule.interval);
    return Number.isInteger(n) && n >= 1 && n <= 99 ? n : null;
}

/** Why the rule cannot be saved, as a translation key; `null` when it is fine. */
export function ruleProblem(rule: RuleState, startDate: string): string | null {
    if (intervalValue(rule) === null) return 'kalender.series.err.interval';
    if (rule.freq === 'weekly' && rule.byDay.length === 0) return 'kalender.series.err.weekdays';
    if (rule.endMode === 'until' && (!rule.untilDate || (startDate && rule.untilDate < startDate))) return 'kalender.series.err.until';
    if (rule.endMode === 'count') {
        const n = Number(rule.count);
        if (!Number.isInteger(n) || n < 1 || n > 1000) return 'kalender.series.err.count';
    }
    return null;
}

/** Rule fields of the create/PATCH body. */
export function ruleBody(rule: RuleState, startDate: string): Record<string, unknown> {
    const body: Record<string, unknown> = { freq: rule.freq, interval: intervalValue(rule) ?? 1, skipHolidays: rule.skipHolidays };
    if (rule.freq === 'weekly') body.byDay = WEEKDAYS.filter((d) => rule.byDay.includes(d));
    else if (rule.freq === 'monthly' && rule.monthlyMode === 'nthWeekday') {
        body.byDay = [weekdayOf(startDate)];
        body.bySetPos = setPosOf(startDate);
    }
    if (rule.endMode === 'until') body.untilDate = rule.untilDate;
    if (rule.endMode === 'count') body.count = Number(rule.count);
    return body;
}

/** Local date/time parts of a `datetime-local` / `date` input value. */
export function splitLocal(value: string): { date: string; time: string } {
    return { date: value.slice(0, 10), time: value.slice(11, 16) };
}

export function minutesBetween(a: Date, b: Date): number {
    return Math.round((b.getTime() - a.getTime()) / 60000);
}

/** Inclusive number of days between two local `YYYY-MM-DD` values. */
export function daysInclusive(startDay: string, endDay: string): number {
    const [y1, m1, d1] = startDay.split('-').map(Number);
    const [y2, m2, d2] = endDay.split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
}

export interface SeriesTemplate {
    calendarId?: string;
    title: string;
    description?: string | null;
    category?: string | null;
    capacity?: number | null;
    allDay: boolean;
    /** Local `YYYY-MM-DD` of the first day. */
    startDate: string;
    startTime: string;
    /** Local `YYYY-MM-DD` of the last day (all-day) and local end time (timed, same day or later). */
    endDate: string;
    endTime: string;
}

/** Duration fields: minutes for timed events (null without end), days for all-day events. */
export function durationFields(tpl: Pick<SeriesTemplate, 'allDay' | 'startDate' | 'startTime' | 'endDate' | 'endTime'>): Record<string, unknown> {
    if (tpl.allDay) return { durationDays: Math.min(366, Math.max(1, daysInclusive(tpl.startDate, tpl.endDate || tpl.startDate))) };
    if (!tpl.endDate || !tpl.endTime) return { durationMinutes: null };
    const minutes = minutesBetween(new Date(`${tpl.startDate}T${tpl.startTime}`), new Date(`${tpl.endDate}T${tpl.endTime}`));
    return { durationMinutes: minutes > 0 ? minutes : null };
}

/** Body of `POST /event-series` and `POST /event-series/preview`. */
export function createSeriesBody(tpl: SeriesTemplate, rule: RuleState): Record<string, unknown> {
    return {
        ...(tpl.calendarId ? { calendarId: tpl.calendarId } : {}),
        title: tpl.title,
        ...(tpl.description ? { description: tpl.description } : {}),
        ...(tpl.category ? { category: tpl.category } : {}),
        ...(tpl.capacity ? { capacity: tpl.capacity } : {}),
        allDay: tpl.allDay,
        startDate: tpl.startDate,
        ...(tpl.allDay ? {} : { startTime: tpl.startTime }),
        ...durationFields(tpl),
        ...ruleBody(rule, tpl.startDate),
    };
}

/** Sign-ups a scope change would touch (for the warning before the scope dialog). */
export function affectedSignups(ev: { attendeeCount?: number; waitlistCount?: number }): number {
    return (ev.attendeeCount ?? 0) + (ev.waitlistCount ?? 0);
}

export function todayKey(): string {
    return dayKey(new Date());
}
