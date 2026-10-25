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
}

export interface TimeReport {
    range: { from: string; to: string };
    includesRates: boolean;
    note: string;
    people: ReportPerson[];
    totals: { minutes: number; hours: number; amountCents: number | null };
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

export const RATE_ROLES = ['trainer', 'abteilungsleitung'] as const;

export function splitMinutes(minutes: number): { hours: number; minutes: number } {
    const m = Math.max(0, Math.round(minutes));
    return { hours: Math.floor(m / 60), minutes: m % 60 };
}

export type ManualProblem = 'order' | 'future' | 'long';

/** Client-side mirror of the obvious server checks (`invalid_time`, `in_future`, `too_long`); the server decides. */
export function manualProblem(startedAt: string, endedAt: string, now = Date.now()): ManualProblem | null {
    const a = new Date(startedAt).getTime();
    const b = new Date(endedAt).getTime();
    if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 'order';
    if (b > now + 60_000) return 'future';
    if (b - a > 24 * 3600_000) return 'long';
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
