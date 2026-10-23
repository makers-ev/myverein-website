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
    /** `null` = the person was erased (Wave 10): the row stays pseudonymised so quorum and votes remain verifiable. */
    memberId: string | null;
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

const TZ = 'Europe/Berlin';

/** Wall-clock parts of an instant in the club's time zone (Europe/Berlin). */
function berlinParts(ms: number): { y: number; mo: number; d: number; h: number; mi: number } {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).formatToParts(new Date(ms));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour'), mi: get('minute') };
}

/** ISO instant -> value for `<input type="datetime-local">` as Europe/Berlin wall-clock time (`''` for none/invalid). */
export function toDatetimeLocal(iso: string | null | undefined): string {
    if (!iso) return '';
    const ms = new Date(iso).getTime();
    if (Number.isNaN(ms)) return '';
    const p = berlinParts(ms);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** `datetime-local` value read as Europe/Berlin wall-clock time -> ISO instant (`null` for empty/invalid). */
export function fromDatetimeLocal(value: string): string | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
    if (!m) return null;
    const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
    const asUtc = Date.UTC(y, mo - 1, d, h, mi);
    // Offset of Berlin at that wall-clock time; evaluated twice so the guess near a DST switch settles.
    const offsetAt = (ms: number) => {
        const p = berlinParts(ms);
        return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - ms;
    };
    let ms = asUtc - offsetAt(asUtc);
    ms = asUtc - offsetAt(ms);
    return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** Date and time of a meeting in Europe/Berlin, formatted for the UI language. */
export function formatMeetingDateTime(iso: string | Date, language: string): string {
    return new Date(iso).toLocaleString(language === 'de' ? 'de-DE' : 'en-GB', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Status to send along when the date changes: a meeting that gets a date leaves `terminfindung` (-> `geplant`), and one
 * that loses its date while only `geplant` goes back to `terminfindung`. `undefined` = leave the status alone.
 */
export function statusForSchedule(currentStatus: string, newScheduledAt: string | null): 'geplant' | 'terminfindung' | undefined {
    if (newScheduledAt && currentStatus === 'terminfindung') return 'geplant';
    if (!newScheduledAt && currentStatus === 'geplant') return 'terminfindung';
    return undefined;
}

export type RsvpResponse = 'zugesagt' | 'abgesagt';

export interface ResolutionFields {
    description: string;
    votesFor: number;
    votesAgainst: number;
    votesAbstain: number;
    result: string;
}

/** A vote count field must be a whole number >= 0; empty, negative, fractional or non-numeric input is a form error. */
export function isValidVoteCount(value: string): boolean {
    return /^\d{1,9}$/.test(value.trim());
}

/** Only the fields that differ from the stored resolution (the backend wants at least one besides the note). */
export function resolutionChanges(
    r: ResolutionFields,
    draft: { description: string; votesFor: string; votesAgainst: string; votesAbstain: string; result: string },
): Partial<ResolutionFields> {
    const out: Partial<ResolutionFields> = {};
    const description = draft.description.trim();
    const result = draft.result.trim();
    if (description && description !== r.description.trim()) out.description = description;
    if (result && result !== r.result.trim()) out.result = result;
    for (const key of ['votesFor', 'votesAgainst', 'votesAbstain'] as const) {
        if (!isValidVoteCount(draft[key])) continue;
        const n = Number(draft[key].trim());
        if (n !== r[key]) out[key] = n;
    }
    return out;
}
