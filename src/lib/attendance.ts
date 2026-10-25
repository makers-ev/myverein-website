/**
 * Attendance lists of events (Wave 12 W4, backend `GET/PUT /events/:id/attendance`). Pure helpers: the summary, the request
 * bodies and the merge of locally buffered changes over a server view. The server is the authority; the buffer only keeps
 * the list usable while the connection is flaky (the PUT is idempotent, so a resend is harmless).
 */

export type AttendanceStatus = 'anwesend' | 'entschuldigt' | 'unentschuldigt';
export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = ['anwesend', 'entschuldigt', 'unentschuldigt'];

export interface AttendanceEntry {
    /** `m:<clubMemberId>` or `g:<attendanceId>`. */
    key: string;
    attendanceId: string | null;
    clubMemberId: string | null;
    guestName: string | null;
    displayName: string;
    status: AttendanceStatus | null;
    source: 'manuell' | 'meldung' | null;
    /** `entschuldigt` derived from an absence report; the reason never reaches the client. */
    prefilled: boolean;
    rsvp: 'angemeldet' | 'warteliste' | null;
    onRoster: boolean;
    isMinor: boolean;
    hasAccount: boolean;
}

export interface AttendanceSummary {
    anwesend: number;
    entschuldigt: number;
    unentschuldigt: number;
    offen: number;
}

export interface AttendanceCorrection {
    displayName: string | null;
    oldStatus: AttendanceStatus | null;
    newStatus: AttendanceStatus | null;
    reason: string;
    changedAt: string;
}

export interface AttendanceView {
    eventId: string;
    tracking: boolean;
    closed: boolean;
    closedAt: string | null;
    canWrite: boolean;
    supervisors: Array<{ clubMemberId: string; displayName: string }>;
    entries: AttendanceEntry[];
    summary: AttendanceSummary;
    supervisionWarning: boolean;
    minorsPresent: number;
    corrections: AttendanceCorrection[];
}

/** One entry of the `PUT` body; exactly one identity. */
export type AttendanceChange = ({ clubMemberId: string } | { attendanceId: string } | { guestName: string }) & { status: AttendanceStatus | null };

export function summarize(entries: readonly Pick<AttendanceEntry, 'status'>[]): AttendanceSummary {
    const s: AttendanceSummary = { anwesend: 0, entschuldigt: 0, unentschuldigt: 0, offen: 0 };
    for (const e of entries) {
        if (e.status) s[e.status] += 1;
        else s.offen += 1;
    }
    return s;
}

/** Request identity of an entry: the member id for members, the attendance id for guests added by hand. */
export function changeFor(entry: Pick<AttendanceEntry, 'clubMemberId' | 'attendanceId'>, status: AttendanceStatus | null): AttendanceChange | null {
    if (entry.clubMemberId) return { clubMemberId: entry.clubMemberId, status };
    if (entry.attendanceId) return { attendanceId: entry.attendanceId, status };
    return null;
}

/** Tapping the active status again clears it (back to open). */
export function toggledStatus(current: AttendanceStatus | null, tapped: AttendanceStatus): AttendanceStatus | null {
    return current === tapped ? null : tapped;
}

/** "Alle anwesend": every entry that is still open becomes present; decided entries (also pre-filled excuses) stay. */
export function markAllPresent(entries: readonly AttendanceEntry[]): AttendanceChange[] {
    const out: AttendanceChange[] = [];
    for (const e of entries) {
        if (e.status !== null) continue;
        const c = changeFor(e, 'anwesend');
        if (c) out.push(c);
    }
    return out;
}

/** Local status overrides (entry key -> status) laid over a server view; the summary is recomputed. */
export type PendingMap = Map<string, AttendanceStatus | null>;

export function applyPending(view: AttendanceView, pending: PendingMap): AttendanceView {
    if (pending.size === 0) return view;
    const entries = view.entries.map((e) => (pending.has(e.key) ? { ...e, status: pending.get(e.key) ?? null, prefilled: false } : e));
    return { ...view, entries, summary: summarize(entries) };
}

/** Minors present while nobody supervises: same rule as the server's `supervisionWarning`, used for the optimistic view. */
export function supervisionMissing(entries: readonly AttendanceEntry[], supervisors: readonly unknown[]): boolean {
    return supervisors.length === 0 && entries.some((e) => e.isMinor && e.status === 'anwesend');
}

/** Attendance quota 0..1 as whole percent text, `null` = no data yet. */
export function percent(rate: number | null | undefined): string | null {
    if (rate === null || rate === undefined || Number.isNaN(rate)) return null;
    return `${Math.round(rate * 100)} %`;
}

// --- Report (W5, `GET /attendance/report`) -----------------------------------------------------

export interface AttendanceCounts {
    present: number;
    excused: number;
    unexcused: number;
    recorded: number;
    /** 0..1, `null` = no data yet. */
    rate: number | null;
}

export interface ReportMember extends AttendanceCounts {
    clubMemberId: string;
    displayName: string;
}

export interface ReportEvent extends AttendanceCounts {
    eventId: string;
    title: string;
    startsAt: string;
    closed: boolean;
    departmentId: string | null;
    guests: number;
}

export interface AttendanceReport {
    range: { from: string; to: string };
    scope: 'group' | 'member';
    departmentIds: string[] | null;
    members: ReportMember[];
    events: ReportEvent[];
    member: ReportMember | null;
    entries: Array<{ eventId: string; title: string; startsAt: string; departmentId: string | null; status: AttendanceStatus }>;
}

export interface ReportFilter {
    memberId?: string;
    departmentId?: string;
    from?: string;
    to?: string;
}

/** Query string of `/attendance/report` (and `.csv`); empty values are left out so the server defaults (last 90 days) apply. */
export function reportQuery(clubId: string, filter: ReportFilter): string {
    const p = new URLSearchParams({ clubId });
    if (filter.memberId) p.set('memberId', filter.memberId);
    if (filter.departmentId) p.set('departmentId', filter.departmentId);
    if (filter.from) p.set('from', filter.from);
    if (filter.to) p.set('to', filter.to);
    return p.toString();
}

/** Server limit: at most 366 days. */
export function reportRangeProblem(from: string, to: string): 'order' | 'long' | null {
    if (!from || !to) return null;
    const a = Date.parse(`${from}T00:00:00Z`);
    const b = Date.parse(`${to}T00:00:00Z`);
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    if (b < a) return 'order';
    return (b - a) / 86_400_000 > 366 ? 'long' : null;
}
