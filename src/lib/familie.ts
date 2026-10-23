import { ApiError, apiFetch } from './api-client';
import { addDaysIso, memberErrorKey, todayIso } from './clubMembers';

/**
 * Guardian area `/familie` (Wave 10 W3). Everything is bound to a ward (child) through the backend's `guardianScope`: a
 * guardian account is not a club member, has no club permissions and reaches only `GET /my-wards` and
 * `/guardian/wards/:wardId/*`. The UI mirrors that: no club internals, only the ward-bound views.
 */

export interface Ward {
    wardId: string;
    name: string;
    firstName: string | null;
    relationship: string | null;
    canConsent: boolean;
    canReportAbsence: boolean;
    hasCustody: boolean;
    validUntil: string | null;
    openConsents: number;
}

export interface WardClub {
    clubId: string;
    clubName: string;
    wards: Ward[];
}

export type WardResponse = 'angemeldet' | 'abgesagt' | 'warteliste';

export interface WardEvent {
    id: string;
    calendarId: string;
    calendarName: string;
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string | null;
    category: string | null;
    capacity: number | null;
    locationName: string | null;
    cancelledAt: string | null;
    cancelReason: string | null;
    response: WardResponse | null;
    /** False when the ward has an own account (answers there) or the event is cancelled. */
    canRespond: boolean;
}

export interface WardContact {
    clubMemberId: string;
    name: string;
    roleType: string;
    department: { id: string; name: string };
    phone: string | null;
    email: string | null;
}

export interface WardOverview {
    ward: { id: string; name: string; firstName: string | null; lastName: string | null; category: { key: string; name: string } | null; departments: { id: string; name: string }[] };
    link: { relationship: string | null; hasCustody: boolean; canConsent: boolean; canReportAbsence: boolean; validUntil: string | null };
    openConsents: number;
    activeAbsences: number;
}

/** Flat list for the ward picker, keeping the club each ward belongs to. */
export interface WardEntry extends Ward {
    clubId: string;
    clubName: string;
}

export function flattenWards(clubs: readonly WardClub[]): WardEntry[] {
    return clubs.flatMap((c) => c.wards.map((w) => ({ ...w, clubId: c.clubId, clubName: c.clubName })));
}

export const wardKey = (w: { clubId: string; wardId: string }) => `${w.clubId}:${w.wardId}`;

/** Calendar day of an instant in the club's zone (`YYYY-MM-DD`). */
export function dayOf(iso: string): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

export interface EventBuckets {
    today: WardEvent[];
    week: WardEvent[];
    later: WardEvent[];
}

/** "Heute" = today, "Diese Woche" = the next six days, "Später" = everything after (the request already caps the range). */
export function bucketEvents(events: readonly WardEvent[], today: string = todayIso()): EventBuckets {
    const weekEnd = addDaysIso(today, 6);
    const out: EventBuckets = { today: [], week: [], later: [] };
    for (const e of events) {
        const day = dayOf(e.startsAt);
        if (day < today) continue;
        if (day === today) out.today.push(e);
        else if (day <= weekEnd) out.week.push(e);
        else out.later.push(e);
    }
    return out;
}

/** Range requested for the ward's events: today and the following 13 days. */
export function eventsRange(today: string = todayIso()): { from: string; to: string } {
    return { from: today, to: addDaysIso(today, 13) };
}

/** Translation key for a failed guardian call (`409 ward_has_account`, `403 guardian_cannot_report_absence`, then generic). */
export function familieErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        const code = (err.details as { code?: unknown } | undefined)?.code;
        if (code === 'ward_has_account') return 'familie.err.wardHasAccount';
        if (code === 'guardian_cannot_report_absence') return 'absence.err.guardianCannot';
    }
    return memberErrorKey(err);
}

/**
 * Where a signed-in account lands when no explicit target was requested: a guardian-only account (no club of its own, at
 * least one ward) goes to `/familie`, everybody else keeps `fallback`. Any failure falls back, a login must never hang on it.
 */
export async function postLoginTarget(fallback: string): Promise<string> {
    try {
        const [clubs, wards] = await Promise.all([apiFetch<{ data: unknown[] }>('/my-clubs'), apiFetch<{ data: WardClub[] }>('/my-wards')]);
        return clubs.data.length === 0 && wards.data.some((c) => c.wards.length > 0) ? '/familie' : fallback;
    } catch {
        return fallback;
    }
}

/** What the account menu offers: guardian-only accounts get the reduced menu, wards unlock the "Familie" link. */
export interface AccountScope {
    hasClub: boolean;
    hasWards: boolean;
}

export async function loadAccountScope(): Promise<AccountScope> {
    const [clubs, wards] = await Promise.all([
        apiFetch<{ data: unknown[] }>('/my-clubs').then((r) => r.data.length > 0),
        apiFetch<{ data: WardClub[] }>('/my-wards').then((r) => r.data.some((c) => c.wards.length > 0)),
    ]);
    return { hasClub: clubs, hasWards: wards };
}

/**
 * Links of the account menu: while the scope is unknown (`null`) nothing is shown so a guardian never sees club links flash by;
 * only a failed lookup (`failed`) falls back to the full menu (the pages enforce access anyway). A guardian-only account sees
 * `Familie` only.
 */
export function visibleAppLinks<L extends { href: string }>(links: readonly L[], scope: AccountScope | null, familyLink: L, failed = false): L[] {
    if (!scope) return failed ? [...links] : [];
    if (!scope.hasClub && scope.hasWards) return [familyLink];
    return scope.hasWards ? [...links, familyLink] : [...links];
}
