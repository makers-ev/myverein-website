import { ApiError, apiFetch } from './api-client';

/** Stored/effective member statuses (backend `MEMBER_STATUSES`, Wave 7 B5). */
export const MEMBER_STATUSES = ['interessent', 'probe', 'aktiv', 'ruhend', 'ausgetreten', 'ausgeschlossen', 'verstorben'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

/** Statuses the board may pick when creating a member (backend `createMemberSchema`). */
export const CREATE_STATUSES = ['interessent', 'probe', 'aktiv', 'ruhend'] as const;

export const LEFT_STATUSES: readonly MemberStatus[] = ['ausgetreten', 'ausgeschlossen', 'verstorben'];

/**
 * Allowed status changes, mirrors `STATUS_TRANSITIONS` in the backend's `src/lib/member-lifecycle.ts` (see the
 * backend README "Member lifecycle"). Only a fallback: the backend stays the authority and answers a forbidden
 * change with 409 + `details.allowed`, which the status dialog prefers.
 */
export const STATUS_TRANSITIONS: Record<MemberStatus, MemberStatus[]> = {
    interessent: ['probe', 'aktiv', 'ausgetreten', 'verstorben'],
    probe: ['aktiv', 'ausgetreten', 'ausgeschlossen', 'verstorben'],
    aktiv: ['ruhend', 'ausgetreten', 'ausgeschlossen', 'verstorben'],
    ruhend: ['aktiv', 'ausgetreten', 'ausgeschlossen', 'verstorben'],
    ausgetreten: ['aktiv'],
    ausgeschlossen: ['aktiv'],
    verstorben: ['aktiv'],
};

export function isLeftStatus(status: string): boolean {
    return (LEFT_STATUSES as readonly string[]).includes(status);
}

export function isMemberStatus(value: unknown): value is MemberStatus {
    return typeof value === 'string' && (MEMBER_STATUSES as readonly string[]).includes(value);
}

export interface MemberDepartment {
    id: string;
    name: string;
    since: string;
    /** `null` = current assignment, otherwise the assignment ended on this date. */
    until: string | null;
}

export interface MemberRole {
    id: string;
    roleType: string;
    departmentId: string | null;
    termEndsAt: string | null;
}

export interface CategoryRef {
    id: string;
    key: string;
    name: string;
}

/**
 * Member shape of `GET /club-members` & co. (backend README "Club members API contract"). The sensitive fields are
 * `undefined` (key absent) unless the caller has `members:read_sensitive` or it is the caller's own row -- the UI
 * must treat "absent" as "do not show / do not send", which is different from `null` ("empty").
 */
export interface ClubMember {
    id: string;
    memberId: string | null;
    userId: string | null;
    hasAccount: boolean;
    name: string | null;
    status: MemberStatus;
    effectiveStatus: MemberStatus;
    category: string | null;
    categoryId: string | null;
    categoryName: string | null;
    categoryObject: (CategoryRef & { votingRight: boolean }) | null;
    joinedAt: string | null;
    leftAt: string | null;
    orgRole: string | null;
    roles: MemberRole[];
    departments: MemberDepartment[];
    email?: string | null;
    contactEmail?: string | null;
    memberNumber?: string | null;
    birthDate?: string | null;
    street?: string | null;
    postalCode?: string | null;
    city?: string | null;
    phone?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    suggestedCategory?: CategoryRef | null;
}

export interface MemberListResponse {
    data: ClubMember[];
    page: number;
    pageSize: number;
    total: number;
}

export interface MemberCategory {
    id: string;
    key: string;
    name: string;
    votingRight: boolean;
    minAge: number | null;
    maxAge: number | null;
    autoTransitionToKey: string | null;
    sortOrder: number;
    archived: boolean;
    archivedAt: string | null;
    memberCount?: number;
}

export interface StatusHistoryEntry {
    id: string;
    fromStatus: string;
    toStatus: string;
    fromCategoryId: string | null;
    toCategoryId: string | null;
    effectiveOn: string;
    reason: string | null;
    changedBy: string | null;
    createdAt: string;
}

export function todayIso(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** True when an exit is booked for a future key date (stored status still live, `leftAt` in the future). */
export function hasPendingExit(member: Pick<ClubMember, 'status' | 'effectiveStatus' | 'leftAt'>): boolean {
    return !isLeftStatus(member.effectiveStatus) && !!member.leftAt && member.leftAt > todayIso();
}

/** Locale for date formatting, derived from the active UI language. */
export function dateLocale(language: string): string {
    return language === 'de' ? 'de-DE' : 'en-GB';
}

export function formatDate(iso: string | null | undefined, language: string): string {
    if (!iso) return '—';
    return new Date(`${iso.slice(0, 10)}T00:00`).toLocaleDateString(dateLocale(language));
}

/** Tailwind classes for a status chip (fixed status colors, readable in light and dark mode). */
export function statusChipClass(status: string): string {
    switch (status) {
        case 'aktiv':
            return 'bg-success/15 text-success';
        case 'probe':
        case 'interessent':
            return 'bg-primary/10 text-primary';
        case 'ruhend':
            return 'bg-warning/15 text-warning';
        case 'ausgeschlossen':
            return 'bg-destructive/10 text-destructive';
        default:
            return 'bg-muted text-muted-foreground';
    }
}

/** Display name of a member's category: backend name, else the translated default key, else the key. */
export function categoryLabel(
    m: Pick<ClubMember, 'category' | 'categoryName'>,
    t: (key: string) => string,
): string {
    if (m.categoryName) return m.categoryName;
    if (m.category) {
        const key = `verein.category.${m.category}`;
        const text = t(key);
        return text === key ? m.category : text;
    }
    return '—';
}

/** Current (not ended) department assignments. */
export function currentDepartments(m: Pick<ClubMember, 'departments'>): MemberDepartment[] {
    return m.departments.filter((d) => d.until === null);
}

/**
 * Maps a backend error onto a translation key (`verein.err.*`). The backend sends English developer strings --
 * those must never reach the user, so every known 409/422/403/404 case gets its own plain-language text and
 * anything else falls back to a generic one per status.
 */
export function memberErrorKey(err: unknown): string {
    if (!(err instanceof ApiError)) return 'verein.err.network';
    const m = err.message;
    switch (err.status) {
        case 403:
            return 'verein.err.forbidden';
        case 404:
            if (/department/i.test(m)) return 'verein.err.departmentNotFound';
            return 'verein.err.notFound';
        case 409:
            if (/member number/i.test(m)) return 'verein.err.memberNumberTaken';
            if (/no account/i.test(m)) return 'verein.err.noAccount';
            if (/already assigned to this department/i.test(m)) return 'verein.err.departmentAssigned';
            if (/status change|already has status/i.test(m)) return 'verein.err.statusNotAllowed';
            if (/nothing to change/i.test(m)) return 'verein.err.nothingToChange';
            if (/key already exists/i.test(m)) return 'verein.err.categoryKeyTaken';
            if (/still has members/i.test(m)) return 'verein.err.categoryHasMembers';
            if (/default category/i.test(m)) return 'verein.err.categoryDefault';
            if (/archived/i.test(m)) return 'verein.err.categoryArchived';
            if (/rejoin|blocked/i.test(m)) return 'verein.err.rejoinBlocked';
            return 'verein.err.conflict';
        case 422:
            if (/unknown or archived category/i.test(m)) return 'verein.err.categoryUnknown';
            if (/requires a reason/i.test(m)) return 'verein.err.reasonRequired';
            if (/reopen/i.test(m)) return 'verein.err.reopenRequired';
            if (/before the join date/i.test(m)) return 'verein.err.dateBeforeJoin';
            if (/future|dated/i.test(m)) return 'verein.err.dateFuture';
            if (/minAge/i.test(m)) return 'verein.err.ageRange';
            if (/requires maxAge/i.test(m)) return 'verein.err.autoNeedsMaxAge';
            if (/cycle/i.test(m)) return 'verein.err.autoCycle';
            if (/autoTransitionToKey/i.test(m)) return 'verein.err.autoTarget';
            if (/moveTo/i.test(m)) return 'verein.err.moveTo';
            if (/derive a valid key|key must be/i.test(m)) return 'verein.err.categoryKeyInvalid';
            if (/ageMin/i.test(m)) return 'verein.err.ageRange';
            return 'verein.err.invalid';
        case 429:
            return 'verein.err.rateLimit';
        default:
            return err.status >= 500 ? 'verein.err.server' : 'verein.err.generic';
    }
}

/** The `details.allowed` list of a 409 "status change not allowed", if the backend sent one. */
export function allowedStatusesFromError(err: unknown): MemberStatus[] | null {
    if (!(err instanceof ApiError) || err.status !== 409) return null;
    const details = err.details as { allowed?: unknown } | undefined;
    if (!details || !Array.isArray(details.allowed)) return null;
    return details.allowed.filter(isMemberStatus);
}

/** `details.memberCount` of a 409 "category still has members". */
export function memberCountFromError(err: unknown): number | null {
    if (!(err instanceof ApiError) || err.status !== 409) return null;
    const details = err.details as { memberCount?: unknown } | undefined;
    return typeof details?.memberCount === 'number' ? details.memberCount : null;
}

export const inputClass =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none';

export const primaryButtonClass =
    'rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50';

export const secondaryButtonClass =
    'rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50';

/** A club member who has a login account, keyed by the Better Auth `member.id` (what loans, key holders, invitees use). */
export interface AccountMember {
    /** Better Auth `member.id` -- NOT `club_members.id`. */
    id: string;
    name: string | null;
}

const DIRECTORY_PAGE_SIZE = 100;
const DIRECTORY_MAX = 5000;

/**
 * Loads all members with an account (`hasAccount` + `memberId`) by walking the paged `GET /club-members`
 * (pageSize 100, at most 5000 entries). Features bound to a login (key holders, loans, meeting invitees) store the
 * account id, so they must use `memberId`, not the club-member `id`. `isCancelled` aborts between pages.
 * Never throws: a caller without list permission (403, e.g. guests) simply gets an empty directory, and names
 * then stay unknown.
 */
export async function loadAccountMembers(clubId: string, isCancelled: () => boolean = () => false): Promise<AccountMember[]> {
    const result: AccountMember[] = [];
    try {
        for (let page = 1; result.length < DIRECTORY_MAX; page++) {
            const res = await apiFetch<{ data: ClubMember[]; total: number }>(
                `/club-members?clubId=${clubId}&page=${page}&pageSize=${DIRECTORY_PAGE_SIZE}&sort=name`,
            );
            if (isCancelled()) return [];
            for (const m of res.data) {
                if (m.hasAccount && m.memberId && !isLeftStatus(m.effectiveStatus)) result.push({ id: m.memberId, name: m.name });
            }
            if (res.data.length < DIRECTORY_PAGE_SIZE || page * DIRECTORY_PAGE_SIZE >= res.total) break;
        }
    } catch {
        return result;
    }
    return result;
}
