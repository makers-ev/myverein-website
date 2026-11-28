import { ApiError } from './api-client';
import { eventErrorCode, eventErrorKey } from './eventErrors';

/**
 * Time tracking for trainers (Wave 12 W10, backend `/time-entries`, `/rate-cards`, `/time-report`). REPORT ONLY: hours and,
 * with `time:read_rates`, hours x rate as a calculation basis. There is no payout, no booking and no payment status anywhere.
 */

export type EntryStatus = 'offen' | 'bestaetigt' | 'abgelehnt';

export interface TimeEntry {
    id: string;
    clubMemberId: string;
    displayName: string;
    eventId: string | null;
    eventTitle: string | null;
    startedAt: string;
    endedAt: string | null;
    minutes: number | null;
    running: boolean;
    source: 'stempeln' | 'aus_termin' | 'manuell';
    status: EntryStatus;
    confirmedAt: string | null;
    /** Wave 16 (older backends omit them): the end was entered afterwards. */
    corrected?: boolean;
    /** Ended by the system after a day; needs checking. */
    autoClosed?: boolean;
    /** Ended (or rejected while running) by the board instead of the person. */
    closedByOther?: boolean;
    /** Still running for more than 16 h. */
    overdue?: boolean;
    /** Running entries: latest allowed end (min of now and start + 16 h). */
    maxEndedAt?: string | null;
}

export interface TimeSuggestion {
    eventId: string;
    title: string;
    startsAt: string;
    endsAt: string | null;
    supervisor: boolean;
}

export interface ReportPerson {
    clubMemberId: string;
    displayName: string;
    entries: number;
    minutes: number;
    hours: number;
    rateCents: number | null;
    amountCents: number | null;
    rateMissing: boolean;
    /** Wave 16: confirmed entries with an end entered afterwards / ended by the system. */
    correctedEntries?: number;
    autoClosedEntries?: number;
}

export type ReportGroupBy = 'person' | 'event' | 'person_event';

/** One report row; event fields are set for `event` and `person_event`, person fields for `person` and `person_event`. */
export interface ReportRow extends Partial<ReportPerson> {
    eventId?: string | null;
    eventTitle?: string | null;
    eventDate?: string | null;
    roleTypes?: string[];
}

export interface TimeReport {
    range: { from: string; to: string };
    includesRates: boolean;
    note: string;
    groupBy?: ReportGroupBy;
    /** Older backends only send `people`. */
    people?: ReportPerson[];
    rows?: ReportRow[];
    totals: { minutes: number; hours?: number; amountCents: number | null; correctedEntries?: number; autoClosedEntries?: number };
}

export interface ReportPeopleOptions {
    people: Array<{ clubMemberId: string; displayName: string; roleTypes?: string[] }>;
    roleTypes: string[];
    /** Events with confirmed hours in the period, newest first. */
    events?: Array<{ eventId: string; title: string; startsAt: string }>;
    /** The server cut the people (1000) or events (300) list. */
    truncated?: boolean;
}

export interface ReportFilters {
    clubId: string;
    from: string;
    to: string;
    departmentId?: string;
    clubMemberIds?: readonly string[];
    roleTypes?: readonly string[];
    eventId?: string;
    groupBy?: ReportGroupBy;
    format?: 'json' | 'csv' | 'xlsx';
}

/** Server limit of `clubMemberIds`. */
export const MAX_REPORT_PEOPLE = 100;

/** Query string of `GET /time-report`: empty filters are left out, the person list is capped at the server limit. */
export function reportQuery(f: ReportFilters): string {
    const qs = new URLSearchParams({ clubId: f.clubId, from: f.from, to: f.to });
    if (f.departmentId) qs.set('departmentId', f.departmentId);
    if (f.clubMemberIds?.length) qs.set('clubMemberIds', f.clubMemberIds.slice(0, MAX_REPORT_PEOPLE).join(','));
    if (f.roleTypes?.length) qs.set('roleTypes', f.roleTypes.join(','));
    if (f.eventId) qs.set('eventId', f.eventId);
    if (f.groupBy) qs.set('groupBy', f.groupBy);
    if (f.format && f.format !== 'json') qs.set('format', f.format);
    return qs.toString();
}

/** Rows of a report regardless of backend version; totals hours derived from minutes when missing. */
export function reportRows(r: TimeReport): ReportRow[] {
    return r.rows ?? r.people ?? [];
}

export function totalHours(r: TimeReport): number {
    return r.totals.hours ?? Math.round((r.totals.minutes / 60) * 100) / 100;
}

export const REPORT_MIME = {
    csv: 'text/csv',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;

export const REPORT_FILENAME = { csv: 'stundenbericht.csv', xlsx: 'stundenbericht.xlsx' } as const;

/** Toggles an id in a selection, refusing to grow beyond `max`. */
export function toggleId(selected: readonly string[], id: string, max = MAX_REPORT_PEOPLE): string[] {
    if (selected.includes(id)) return selected.filter((x) => x !== id);
    return selected.length >= max ? [...selected] : [...selected, id];
}

export interface RateCard {
    id: string;
    clubMemberId: string | null;
    displayName: string | null;
    roleType: string | null;
    hourlyRateCents: number;
    validFrom: string;
    validUntil: string | null;
}

/** Every club role type the backend accepts for a rate card (`CLUB_ROLE_TYPES`), implicit base role first. */
export const RATE_ROLES = ['mitglied', 'vorsitz', 'stellv_vorsitz', 'kassenwart', 'schriftfuehrer', 'beisitzer', 'abteilungsleitung', 'trainer', 'erziehungsberechtigt'] as const;

/** Text key of a role in the rate UI: the implicit `mitglied` role reads "Alle Mitglieder", the rest reuses the role names. */
export function rateRoleKey(role: string): string {
    return role === 'mitglied' ? 'time.role.mitglied' : `verein.role.${role}`;
}

/** `order` = "Gültig bis" before "Gültig ab" (the backend rejects it too). */
export function rateRangeProblem(validFrom: string, validUntil: string): 'order' | null {
    return validFrom && validUntil && validUntil < validFrom ? 'order' : null;
}

/** Body of `PATCH /rate-cards/:id`: a cleared end date is sent as `null`. */
export function ratePatchBody(cents: number, validFrom: string, validUntil: string): Record<string, unknown> {
    return { hourlyRateCents: cents, validFrom, validUntil: validUntil || null };
}

export interface RateCardGroups {
    roles: RateCard[];
    people: RateCard[];
}

/** Role cards (in `RATE_ROLES` order) and personal cards (by name), each newest "Gültig ab" first. */
export function groupRateCards(cards: readonly RateCard[]): RateCardGroups {
    const newest = (a: RateCard, b: RateCard) => b.validFrom.localeCompare(a.validFrom);
    const roleIdx = (c: RateCard) => {
        const i = (RATE_ROLES as readonly string[]).indexOf(c.roleType ?? '');
        return i === -1 ? RATE_ROLES.length : i;
    };
    const personal = cards.filter((c) => c.clubMemberId);
    return {
        roles: cards.filter((c) => !c.clubMemberId).sort((a, b) => roleIdx(a) - roleIdx(b) || newest(a, b)),
        people: personal.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? '') || newest(a, b)),
    };
}

/** Text key for a failed rate-card request; 409 = an overlapping card of the same target. */
export function rateErrorKey(err: unknown): string {
    if (err instanceof ApiError && err.status === 409) return 'events.err.rate_overlap';
    return eventErrorKey(err);
}

export function splitMinutes(minutes: number): { hours: number; minutes: number } {
    const m = Math.max(0, Math.round(minutes));
    return { hours: Math.floor(m / 60), minutes: m % 60 };
}

/** Server limit of a single entry. */
export const MAX_ENTRY_HOURS = 16;

/** From this running time on the UI asks "did you forget to clock out?". */
export const FORGOT_HINT_HOURS = 8;

export type RunningLevel = 'ok' | 'hint' | 'stuck';

export interface RunningState {
    /** Whole minutes since the start (never negative). */
    minutes: number;
    days: number;
    hours: number;
    rest: number;
    /** `hint` from 8 h, `stuck` beyond 16 h: the server refuses a plain clock-out then. */
    level: RunningLevel;
}

/** How long an entry has been running and how loudly the UI should say so. */
export function runningState(startedAt: string, now = Date.now()): RunningState {
    const total = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60_000));
    const level: RunningLevel = total > MAX_ENTRY_HOURS * 60 ? 'stuck' : total >= FORGOT_HINT_HOURS * 60 ? 'hint' : 'ok';
    return { minutes: total, days: Math.floor(total / 1440), hours: Math.floor((total % 1440) / 60), rest: total % 60, level };
}

/** Text key for a failed clock-out: `too_long` explains the way out instead of the generic 16 h message. */
export function clockOutErrorKey(err: unknown): string {
    return eventErrorCode(err) === 'too_long' ? 'time.err.clockOutTooLong' : eventErrorKey(err);
}

/** The entry is stuck: server flag, or (older backends) running for more than 16 h. */
export function isOverdue(e: Pick<TimeEntry, 'running' | 'overdue' | 'startedAt'>, now = Date.now()): boolean {
    return e.running && (e.overdue ?? runningState(e.startedAt, now).level === 'stuck');
}

/** Latest end a running entry may get: the server value, else min(now, start + 16 h). */
export function latestEnd(e: Pick<TimeEntry, 'startedAt' | 'maxEndedAt'>, now = Date.now()): number {
    if (e.maxEndedAt) return new Date(e.maxEndedAt).getTime();
    return Math.min(now, new Date(e.startedAt).getTime() + MAX_ENTRY_HOURS * 3600_000);
}

export type EndProblem = 'invalid' | 'order' | 'future' | 'long';

/** Client mirror of the end-time rules (start < end <= min(now, start + 16 h)); the server decides. `endLocal` is a datetime-local value. */
export function endTimeProblem(startedAt: string, endLocal: string, now = Date.now(), maxEndedAt?: string | null): EndProblem | null {
    const end = new Date(endLocal).getTime();
    const start = new Date(startedAt).getTime();
    if (!endLocal || Number.isNaN(end)) return 'invalid';
    if (end <= start) return 'order';
    if (end > start + MAX_ENTRY_HOURS * 3600_000) return 'long';
    if (end > latestEnd({ startedAt, maxEndedAt }, now) + 60_000) return 'future';
    return null;
}

export const END_PROBLEM_KEY: Record<EndProblem, string> = {
    invalid: 'time.end.invalid',
    order: 'events.err.invalid_time',
    future: 'events.err.in_future',
    long: 'time.err.endTooLong',
};

/** datetime-local value (local time, minutes) of a timestamp. */
export function toLocalValue(ms: number): string {
    const d = new Date(ms);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Text key for a failed "set the end" request (clock-out with `endedAt`, PATCH, close). */
export function endTimeErrorKey(err: unknown): string {
    return eventErrorCode(err) === 'too_long' ? 'time.err.endTooLong' : eventErrorKey(err);
}

/** Pills shown next to an entry: how its end came about. */
export function entryMarks(e: Pick<TimeEntry, 'corrected' | 'autoClosed' | 'closedByOther'>): Array<'autoClosed' | 'closedByOther' | 'corrected'> {
    const marks: Array<'autoClosed' | 'closedByOther' | 'corrected'> = [];
    if (e.autoClosed) marks.push('autoClosed');
    if (e.closedByOther) marks.push('closedByOther');
    else if (e.corrected && !e.autoClosed) marks.push('corrected');
    return marks;
}

export type ManualProblem = 'order' | 'future' | 'long';

/** Client-side mirror of the obvious server checks (`invalid_time`, `in_future`, `too_long`); the server decides. */
export function manualProblem(startedAt: string, endedAt: string, now = Date.now()): ManualProblem | null {
    const a = new Date(startedAt).getTime();
    const b = new Date(endedAt).getTime();
    if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 'order';
    if (b > now + 60_000) return 'future';
    if (b - a > MAX_ENTRY_HOURS * 3600_000) return 'long';
    return null;
}

/** Body of `POST /rate-cards`: exactly one of person / role. */
export function rateBody(target: { clubMemberId: string | null; roleType: string | null }, cents: number, validFrom: string, validUntil: string): Record<string, unknown> {
    return {
        ...(target.clubMemberId ? { clubMemberId: target.clubMemberId } : { roleType: target.roleType }),
        hourlyRateCents: cents,
        validFrom,
        ...(validUntil ? { validUntil } : {}),
    };
}

export function defaultRange(now = new Date()): { from: string; to: string } {
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
}
