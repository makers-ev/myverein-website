import { ApiError } from './api-client';

/**
 * "Wer hat Zeit?" while planning an event (Wave 16, backend `GET /events/availability-hints`). A HINT only: it never blocks saving,
 * people without entries are "unbekannt" (never "nicht verfuegbar"), and notes or reasons are never part of the answer.
 */

export interface AvailabilityHints {
    calendarId: string;
    eventId: string | null;
    startsAt: string;
    endsAt: string | null;
    timezone: string;
    pool: 'department' | 'calendar_grants' | 'club';
    counts: { total: number; verfuegbar: number; nicht_verfuegbar: number; unbekannt: number };
    /** Only readers with the calendar-management right get the names. */
    includesNames: boolean;
    unavailablePeople: Array<{ clubMemberId: string; displayName: string }> | null;
    truncated: boolean;
}

/** Server limit of the asked range. */
export const MAX_HINT_DAYS = 14;

export interface HintInput {
    clubId: string;
    calendarId: string;
    startsAt: string;
    endsAt: string | null;
    eventId?: string;
}

export type HintRequest = { kind: 'query'; query: string } | { kind: 'skip'; reason: 'incomplete' | 'range' };

/** Query string of the request, or why none is sent (incomplete input, range beyond 14 days). The server re-checks everything. */
export function hintRequest(i: HintInput): HintRequest {
    const start = new Date(i.startsAt).getTime();
    const end = i.endsAt ? new Date(i.endsAt).getTime() : null;
    if (!i.calendarId || Number.isNaN(start) || (end !== null && (Number.isNaN(end) || end <= start))) return { kind: 'skip', reason: 'incomplete' };
    if (end !== null && end - start > MAX_HINT_DAYS * 86_400_000) return { kind: 'skip', reason: 'range' };
    const qs = new URLSearchParams({ clubId: i.clubId, calendarId: i.calendarId, startsAt: new Date(start).toISOString() });
    if (end !== null) qs.set('endsAt', new Date(end).toISOString());
    if (i.eventId) qs.set('eventId', i.eventId);
    return { kind: 'query', query: qs.toString() };
}

export type HintFailure = 'forbidden' | 'rate' | 'range' | 'error';

/** 403 = not allowed to see hints (the section simply stays away), 429 = too many requests, anything else = generic error. */
export function hintFailure(err: unknown): HintFailure {
    if (err instanceof ApiError) {
        if (err.status === 403) return 'forbidden';
        if (err.status === 429) return 'rate';
        if ((err.details as { code?: unknown } | undefined)?.code === 'range_too_long') return 'range';
    }
    return 'error';
}


/** Names of the unavailable people, sorted for reading; empty when the backend sent none. */
export function sortedNames(h: AvailabilityHints): string[] {
    return (h.unavailablePeople ?? []).map((p) => p.displayName).sort((a, b) => a.localeCompare(b, 'de'));
}
