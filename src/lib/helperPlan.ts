/**
 * Helper plan of an event (Wave 12 W8, backend `/events/:id/helpers`, `/shifts/*`, `/swaps/*`). Pure helpers: the traffic light,
 * the form checks and the swap actions a viewer has. The server enforces capacity, overlap and the minors rule; the UI only
 * explains and never hides a server error.
 */

export interface Swap {
    id: string;
    signupId: string;
    fromClubMemberId: string;
    fromName: string | null;
    toClubMemberId: string | null;
    toMe: boolean;
    mine: boolean;
    createdAt: string;
}

export interface ShiftSignup {
    signupId: string;
    clubMemberId: string;
    displayName: string | null;
    mine: boolean;
}

export interface Shift {
    id: string;
    startsAt: string;
    endsAt: string;
    capacity: number;
    minStaff: number;
    filled: number;
    free: number;
    full: boolean;
    understaffed: boolean;
    mine: boolean;
    mySignupId: string | null;
    signups: ShiftSignup[];
    swaps: Swap[];
}

export interface Station {
    id: string;
    name: string;
    description: string | null;
    sortOrder: number;
    shifts: Shift[];
}

export interface MyShift {
    shiftId: string;
    stationId: string;
    stationName: string;
    startsAt: string;
    endsAt: string;
    signupId: string;
}

export interface HelperPlan {
    eventId: string;
    cancelled: boolean;
    canManage: boolean;
    stations: Station[];
    mine: MyShift[];
}

export interface Candidate {
    clubMemberId: string;
    displayName: string;
    availability: 'verfuegbar' | 'nicht_verfuegbar' | 'unbekannt';
    hasAccount: boolean;
    isMinor: boolean;
    alreadyOnShift: boolean;
    conflicting: boolean;
}

export type ShiftLight = 'red' | 'green' | 'yellow';

/** Traffic light: understaffed red, full green, otherwise yellow. Always shown with a text, never color alone. */
export function shiftLight(s: Pick<Shift, 'understaffed' | 'full'>): ShiftLight {
    if (s.understaffed) return 'red';
    return s.full ? 'green' : 'yellow';
}

export function planTotals(plan: Pick<HelperPlan, 'stations'>): { shifts: number; understaffed: number; open: number } {
    let shifts = 0;
    let understaffed = 0;
    let open = 0;
    for (const st of plan.stations)
        for (const sh of st.shifts) {
            shifts += 1;
            if (sh.understaffed) understaffed += 1;
            open += sh.free;
        }
    return { shifts, understaffed, open };
}

export type ShiftProblem = 'order' | 'capacity' | 'minStaff' | 'range';

/** Local `datetime-local` values; the server also rejects overlaps (`shift_overlap`) and a capacity below the filled places. */
export function shiftProblem(startsAt: string, endsAt: string, capacity: string, minStaff: string): ShiftProblem | null {
    if (!startsAt || !endsAt) return 'order';
    const a = new Date(startsAt).getTime();
    const b = new Date(endsAt).getTime();
    if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 'order';
    if (b - a > 7 * 86_400_000) return 'range';
    const cap = Number(capacity);
    if (!Number.isInteger(cap) || cap < 1 || cap > 500) return 'capacity';
    const min = minStaff === '' ? 0 : Number(minStaff);
    if (!Number.isInteger(min) || min < 0 || min > cap) return 'minStaff';
    return null;
}

export function shiftBody(startsAt: string, endsAt: string, capacity: string, minStaff: string): { startsAt: string; endsAt: string; capacity: number; minStaff: number } {
    return { startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), capacity: Number(capacity), minStaff: minStaff === '' ? 0 : Number(minStaff) };
}

export interface SwapActions {
    /** The addressee of a "tauschen mit" request. */
    respond: Swap[];
    /** Open give-aways (no addressee) anybody not on the shift may take over. */
    takeOver: Swap[];
    /** Own requests, withdrawable. */
    withdraw: Swap[];
}

/**
 * Swap actions for the person acted for (`actingId` = their club member id; the caller or a ward). Derived from the
 * sign-ups and the swap addressee, not from the caller-relative `mine`/`toMe` flags, so acting for a ward is correct.
 */
export function swapActions(shift: Pick<Shift, 'swaps' | 'signups'>, actingId: string | null): SwapActions {
    const onShift = actingId !== null && shift.signups.some((s) => s.clubMemberId === actingId);
    return {
        respond: shift.swaps.filter((w) => actingId !== null && w.toClubMemberId === actingId),
        takeOver: onShift ? [] : shift.swaps.filter((w) => w.fromClubMemberId !== actingId && w.toClubMemberId === null),
        withdraw: shift.swaps.filter((w) => actingId !== null && w.fromClubMemberId === actingId),
    };
}

export function isOnShift(shift: Pick<Shift, 'signups'>, actingId: string | null): boolean {
    return actingId !== null && shift.signups.some((s) => s.clubMemberId === actingId);
}

/** Whether the person's sign-up can be offered for swapping (no open request of theirs yet). */
export function canOfferSwap(shift: Pick<Shift, 'signups' | 'swaps'>, actingId: string | null): boolean {
    return isOnShift(shift, actingId) && !shift.swaps.some((w) => w.fromClubMemberId === actingId);
}

/** Sorts candidates: available first, unknown next, unavailable last; ties by name (the server returns no ranking). */
export function sortCandidates(list: readonly Candidate[]): Candidate[] {
    const rank = { verfuegbar: 0, unbekannt: 1, nicht_verfuegbar: 2 } as const;
    return [...list].sort((a, b) => rank[a.availability] - rank[b.availability] || a.displayName.localeCompare(b.displayName, 'de'));
}
