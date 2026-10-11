/** Meeting types of the backend (`MEETING_TYPES`, `meetings.type` enum, Wave 7 B17). */
export const MEETING_TYPES = ['vorstandssitzung', 'mitgliederversammlung', 'sonstige'] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

export function isMeetingType(value: unknown): value is MeetingType {
    return typeof value === 'string' && (MEETING_TYPES as readonly string[]).includes(value);
}

/** Translation key of a type; legacy/unknown values yield `null` (show the raw value). */
export function meetingTypeKey(type: string): string | null {
    return isMeetingType(type) ? `treffen.type.${type}` : null;
}

/** Row of `GET /meetings/:id/attendance`. */
export interface AttendanceRow {
    memberId: string;
    present: boolean;
    hasVotingRight: boolean;
    proxyForMemberId: string | null;
}

/** What the user changed for one member; absent fields are untouched. */
export type AttendanceEdit = Partial<Pick<AttendanceRow, 'present' | 'hasVotingRight' | 'proxyForMemberId'>>;

/** Values shown for a member without a stored row (backend column defaults). */
export const ATTENDANCE_DEFAULTS = { present: false, hasVotingRight: true, proxyForMemberId: null } as const;

/** Stored row merged with the user's pending edit (what the table displays). */
export function effectiveAttendance(stored: AttendanceRow | undefined, edit: AttendanceEdit | undefined): Omit<AttendanceRow, 'memberId'> {
    return {
        present: edit?.present ?? stored?.present ?? ATTENDANCE_DEFAULTS.present,
        hasVotingRight: edit?.hasVotingRight ?? stored?.hasVotingRight ?? ATTENDANCE_DEFAULTS.hasVotingRight,
        proxyForMemberId: edit && 'proxyForMemberId' in edit ? (edit.proxyForMemberId ?? null) : (stored?.proxyForMemberId ?? ATTENDANCE_DEFAULTS.proxyForMemberId),
    };
}

/**
 * Body of `PATCH /meetings/:id/attendance`: only members whose value really differs from what is stored, and only the
 * differing fields. Never "everything not ticked = not present" -- the backend treats the batch as a partial update, so
 * re-saving can not wipe stored attendance. Empty array = nothing to send.
 */
export function buildAttendancePatch(stored: AttendanceRow[], edits: Record<string, AttendanceEdit>): ({ memberId: string } & AttendanceEdit)[] {
    const byMember = new Map(stored.map((r) => [r.memberId, r]));
    const out: ({ memberId: string } & AttendanceEdit)[] = [];
    for (const [memberId, edit] of Object.entries(edits)) {
        const base = byMember.get(memberId);
        const entry: { memberId: string } & AttendanceEdit = { memberId };
        if (edit.present !== undefined && edit.present !== (base?.present ?? ATTENDANCE_DEFAULTS.present)) entry.present = edit.present;
        if (edit.hasVotingRight !== undefined && edit.hasVotingRight !== (base?.hasVotingRight ?? ATTENDANCE_DEFAULTS.hasVotingRight)) entry.hasVotingRight = edit.hasVotingRight;
        if ('proxyForMemberId' in edit && (edit.proxyForMemberId ?? null) !== (base?.proxyForMemberId ?? ATTENDANCE_DEFAULTS.proxyForMemberId)) {
            entry.proxyForMemberId = edit.proxyForMemberId ?? null;
        }
        if (Object.keys(entry).length > 1) out.push(entry);
    }
    return out;
}

/** ISO instant -> value for `<input type="datetime-local">` in the browser's local time (`''` for none/invalid). */
export function toDatetimeLocal(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `datetime-local` value -> ISO instant (`null` for empty/invalid). */
export function fromDatetimeLocal(value: string): string | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export type RsvpResponse = 'zugesagt' | 'abgesagt';
