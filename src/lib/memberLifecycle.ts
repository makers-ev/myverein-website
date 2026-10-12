import { ApiError } from './api-client';

/**
 * Pure types and helpers for the Wave 7 account-linking (B4), exit workflow and club settings (B6) UI. Everything
 * here is free of React and network access so it can be unit-tested (`memberLifecycle.test.ts`).
 */

// ---- club settings -------------------------------------------------------------------------------------------

export const NOTICE_MODES = ['immediate', 'month_end', 'quarter_end', 'year_end'] as const;
export type NoticeMode = (typeof NOTICE_MODES)[number];

export function isNoticeMode(value: unknown): value is NoticeMode {
    return typeof value === 'string' && (NOTICE_MODES as readonly string[]).includes(value);
}

/**
 * `GET /club-settings`. The GET answer deliberately omits `memberNumberPrefix` (only the PATCH answer carries it), so
 * it is optional here: `undefined` = "not known", `null` = "default (slug abbreviation)".
 */
export interface ClubSettings {
    noticePeriodDays: number | null;
    noticeMode: NoticeMode | null;
    memberNumberPrefix?: string | null;
    allowSelfLoans: boolean;
}

export interface NoticePreview {
    requestedOn: string;
    noticePeriodDays: number | null;
    noticeMode: NoticeMode | null;
    earliestEffectiveOn: string;
}

/** Translation key (+ params) of the one-line notice rule shown next to the "Kündigen" button. */
export function noticeRuleText(
    settings: Pick<NoticePreview, 'noticePeriodDays' | 'noticeMode'>,
): { key: string; params: Record<string, number> } {
    const days = settings.noticePeriodDays ?? 0;
    const mode = settings.noticeMode && settings.noticeMode !== 'immediate' ? settings.noticeMode : null;
    if (days === 0 && mode === null) return { key: 'verein.exit.rule.none', params: {} };
    if (mode === null) return { key: 'verein.exit.rule.days', params: { days } };
    if (days === 0) return { key: `verein.exit.rule.${mode}`, params: {} };
    return { key: `verein.exit.rule.days.${mode}`, params: { days } };
}

/** Normalises the member-number prefix input like the backend does (trim, upper case); `null` for empty input. */
export function normalizePrefix(input: string): string | null {
    const value = input.trim().toUpperCase();
    return value === '' ? null : value;
}

export function isValidPrefix(value: string): boolean {
    return /^[A-Z0-9]{1,10}$/.test(value);
}

/** Parses the notice-period input: empty = no period (`null`), else an integer 0-365; `undefined` = invalid. */
export function parseNoticeDays(input: string): number | null | undefined {
    const value = input.trim();
    if (value === '') return null;
    if (!/^\d{1,3}$/.test(value)) return undefined;
    const n = Number(value);
    return n >= 0 && n <= 365 ? n : undefined;
}

// ---- exit requests -------------------------------------------------------------------------------------------

export const EXIT_KINDS = ['cancellation', 'exclusion'] as const;
export type ExitKind = (typeof EXIT_KINDS)[number];
export const EXIT_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'] as const;
export type ExitStatus = (typeof EXIT_STATUSES)[number];
/** Statuses of the "Entschieden" tab of the board queue. */
export const DECIDED_STATUSES: readonly ExitStatus[] = ['approved', 'rejected', 'withdrawn'];

export interface ExitRequest {
    id: string;
    clubMemberId: string;
    memberName: string | null;
    hasAccount: boolean;
    kind: ExitKind;
    status: ExitStatus;
    requestedBy: string | null;
    requestedOn: string;
    desiredEffectiveOn: string | null;
    effectiveOn: string | null;
    /** Cancellations only. */
    earliestEffectiveOn: string | null;
    proposedEffectiveOn: string | null;
    reason: string | null;
    decidedBy: string | null;
    decidedAt: string | null;
    decisionNote: string | null;
    createdAt: string;
}

export interface ExitChecklist {
    openLoans: { id: string; itemId: string; itemName: string; borrowedAt: string; dueAt: string | null; overdue: boolean }[];
    keys: { id: string; locationId: string; locationName: string }[];
    isEmpty: boolean;
}

export interface ExitRequestDetail extends ExitRequest {
    checklist: ExitChecklist;
}

/** Withdrawable: still pending, or an approved cancellation whose exit date has not been reached yet. */
export function canWithdraw(request: Pick<ExitRequest, 'status' | 'kind' | 'effectiveOn'>, today: string): boolean {
    if (request.status === 'pending') return true;
    return request.status === 'approved' && request.kind === 'cancellation' && !!request.effectiveOn && request.effectiveOn > today;
}

/** The date an approval without override uses; falls back to the earliest date when the backend sent no proposal. */
export function proposedDate(request: Pick<ExitRequest, 'proposedEffectiveOn' | 'earliestEffectiveOn' | 'desiredEffectiveOn'>): string | null {
    return request.proposedEffectiveOn ?? request.earliestEffectiveOn ?? request.desiredEffectiveOn;
}

/** `organization` role string of Better Auth may be a comma separated list. */
export function isOwnerOrgRole(role: string | null | undefined): boolean {
    return (role ?? '').split(',').some((r) => r.trim() === 'owner');
}

/** Machine-readable `details.code` of a backend error, if any. */
export function errorDetailsCode(err: unknown): string | null {
    if (!(err instanceof ApiError)) return null;
    const code = (err.details as { code?: unknown } | undefined)?.code;
    return typeof code === 'string' ? code : null;
}

// ---- invitations / unlink --------------------------------------------------------------------------------------

export type InviteStatus = 'pending' | 'expired' | 'accepted';

export interface MemberInvite {
    id: string;
    clubMemberId: string;
    email: string;
    status: InviteStatus;
    expiresAt: string;
    acceptedAt: string | null;
    createdAt: string;
    /** Only in the POST answer. */
    emailSent?: boolean;
}

export interface InvitePreview {
    clubId: string;
    clubName: string | null;
    memberName: string | null;
    invitedEmail: string;
    emailMatches: boolean;
    expiresAt: string;
}

export interface InviteAccepted {
    clubId: string;
    clubName: string | null;
    clubMemberId: string;
    memberId: string;
    /** The account's own untouched member record was merged into the invited one (`clubMemberId` = the kept row). */
    merged?: boolean;
}

/** Translation key of the success text of an accepted invitation (merged accounts get the merge notice). */
export function acceptedNoticeKey(accepted: Pick<InviteAccepted, 'merged'>): 'verein.invite.done.merged' | 'verein.invite.done.body' {
    return accepted.merged === true ? 'verein.invite.done.merged' : 'verein.invite.done.body';
}

/** Kinds of data that block an automatic merge (`details.conflicts[]` of a 409 `merge_conflict`). */
export const MERGE_CONFLICT_KINDS = ['member_number', 'departments', 'photo', 'status_history', 'exit_requests', 'custom_fields', 'guest_account'] as const;
export type MergeConflictKind = (typeof MERGE_CONFLICT_KINDS)[number];

/** The known conflict kinds of a 409 `merge_conflict` (unknown kinds are dropped, duplicates removed); `null` for any other error. */
export function mergeConflictKinds(err: unknown): MergeConflictKind[] | null {
    if (!(err instanceof ApiError) || err.status !== 409 || errorDetailsCode(err) !== 'merge_conflict') return null;
    const raw = (err.details as { conflicts?: unknown }).conflicts;
    const list = Array.isArray(raw) ? raw : [];
    return MERGE_CONFLICT_KINDS.filter((kind) => list.includes(kind));
}

export function mergeConflictKindKey(kind: MergeConflictKind): string {
    return `verein.invite.conflict.${kind}`;
}

/** A 409 `merge_busy` is transient (someone edits the record right now): offer "Erneut versuchen". */
export function isMergeBusy(err: unknown): boolean {
    return err instanceof ApiError && err.status === 409 && errorDetailsCode(err) === 'merge_busy';
}

/** Outcome of a failed accept: text, plain-language conflict explanations and whether a retry makes sense. */
export type AcceptFailure =
    | { kind: 'invalid' }
    | { kind: 'message'; textKey: string; conflictKeys: string[]; retry: boolean };

/**
 * A 404 on accept may also mean "the first request already succeeded" (lost response, double submit: the token is used
 * up). Asks the own membership of the previewed club: linked = the account now is a member, else the invitation is
 * really invalid. Any failure of the check counts as invalid.
 */
export async function resolveLostAccept(fetchOwnMembership: () => Promise<{ data?: { memberId?: string | null } | null }>): Promise<'linked' | 'invalid'> {
    try {
        const res = await fetchOwnMembership();
        return res.data?.memberId ? 'linked' : 'invalid';
    } catch {
        return 'invalid';
    }
}

export function classifyAcceptError(err: unknown, fallback: (e: unknown) => string): AcceptFailure {
    if (err instanceof ApiError && err.status === 404) return { kind: 'invalid' };
    if (err instanceof ApiError && err.status === 429) {
        return { kind: 'message', textKey: 'verein.invite.err.rateLimit', conflictKeys: [], retry: true };
    }
    // The invited member got linked in the meantime (parallel accept): for the invitee that reads "already linked".
    if (err instanceof ApiError && err.status === 409 && !errorDetailsCode(err) && /already has an account/i.test(err.message)) {
        return { kind: 'message', textKey: 'verein.invite.err.alreadyLinked', conflictKeys: [], retry: false };
    }
    if (err instanceof ApiError && err.status === 403 && !errorDetailsCode(err)) {
        return { kind: 'message', textKey: 'verein.invite.err.emailMismatch', conflictKeys: [], retry: false };
    }
    const kinds = mergeConflictKinds(err);
    return {
        kind: 'message',
        textKey: fallback(err),
        conflictKeys: kinds ? kinds.map(mergeConflictKindKey) : [],
        retry: isMergeBusy(err),
    };
}

export function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.trim().length <= 320;
}

/** Items that an account unlink would delete, in display order (keys of the 409 `account_has_open_items` details). */
export const UNLINK_BLOCKER_KEYS = ['openLoans', 'keys', 'guardianLinks', 'departmentsLed', 'eventRsvps', 'meetingInvites', 'roles'] as const;
export type UnlinkBlockerKey = (typeof UNLINK_BLOCKER_KEYS)[number];

/** The non-zero counts of a 409 `account_has_open_items`, or `null` when the error is something else. */
export function unlinkBlockers(err: unknown): { key: UnlinkBlockerKey; count: number }[] | null {
    if (!(err instanceof ApiError) || err.status !== 409 || errorDetailsCode(err) !== 'account_has_open_items') return null;
    const details = err.details as Record<string, unknown>;
    return UNLINK_BLOCKER_KEYS.flatMap((key) => {
        const value = details[key];
        return typeof value === 'number' && value > 0 ? [{ key, count: value }] : [];
    });
}

/** Invite token as the backend accepts it (`min(16).max(200)`); anything else is not worth a request. */
export function isPlausibleInviteToken(token: string | null | undefined): token is string {
    return typeof token === 'string' && token.length >= 16 && token.length <= 200 && /^[A-Za-z0-9_-]+$/.test(token);
}

export const INVITE_TOKEN_STORAGE_KEY = 'myverein.inviteToken';
/** The token also survives opening the verification e-mail in a new tab (localStorage), but only this long. */
export const INVITE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Minimal slice of `Storage` so the helpers below work with `sessionStorage`/`localStorage` and with a test double. */
export interface TokenStore {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

/** Storage access may throw (private mode, blocked cookies); a failing store is simply skipped. */
function safely<T>(action: () => T): T | null {
    try {
        return action();
    } catch {
        return null;
    }
}

function readStashed(store: TokenStore, now: number): string | null {
    const raw = safely(() => store.getItem(INVITE_TOKEN_STORAGE_KEY));
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as { token?: unknown; exp?: unknown };
        if (typeof parsed.exp === 'number' && parsed.exp > now && isPlausibleInviteToken(typeof parsed.token === 'string' ? parsed.token : null)) {
            return parsed.token as string;
        }
    } catch {
        // fall through: unreadable entry
    }
    safely(() => store.removeItem(INVITE_TOKEN_STORAGE_KEY));
    return null;
}

/** Returned by `resolveInviteToken` for a link with a malformed `?token=` (real tokens are at least 16 characters). */
export const INVALID_INVITE_LINK = 'invalid-link';

/**
 * Token of the invitation link: the query string wins (and is stashed with a 24 h expiry in every given store, so it
 * survives the login round trip and a verification e-mail opened in another tab), else the first valid stashed one.
 * The caller strips the token from the visible URL afterwards (`history.replaceState`).
 */
export function resolveInviteToken(search: string, stores: TokenStore[], now: number = Date.now()): string | null {
    const fromQuery = new URLSearchParams(search).get('token');
    // A link that carries a (broken) token must not silently fall back to an older stashed invitation.
    if (fromQuery && !isPlausibleInviteToken(fromQuery)) return INVALID_INVITE_LINK;
    if (isPlausibleInviteToken(fromQuery)) {
        const value = JSON.stringify({ token: fromQuery, exp: now + INVITE_TOKEN_TTL_MS });
        for (const store of stores) safely(() => store.setItem(INVITE_TOKEN_STORAGE_KEY, value));
        return fromQuery;
    }
    for (const store of stores) {
        const stashed = readStashed(store, now);
        if (stashed) return stashed;
    }
    return null;
}

export function clearInviteToken(stores: TokenStore[]): void {
    for (const store of stores) safely(() => store.removeItem(INVITE_TOKEN_STORAGE_KEY));
}

export const INVITE_LOGIN_REDIRECT_KEY = 'myverein.inviteLoginRedirect';
const LOGIN_REDIRECT_COOLDOWN_MS = 60_000;

/**
 * Guards against a redirect loop between `/einladung` and `/login-signup` (e.g. a session that is not visible yet right
 * after login): the automatic redirect happens at most once per minute, afterwards the page offers a manual link.
 */
export function shouldAutoRedirectToLogin(store: TokenStore, now: number = Date.now()): boolean {
    const last = Number(safely(() => store.getItem(INVITE_LOGIN_REDIRECT_KEY)) ?? 0);
    if (Number.isFinite(last) && last > 0 && now - last < LOGIN_REDIRECT_COOLDOWN_MS) return false;
    safely(() => store.setItem(INVITE_LOGIN_REDIRECT_KEY, String(now)));
    return true;
}

/** Error key for the unlink action: "Member has no account" must not read like the role-assignment hint. */
export function unlinkErrorKey(err: unknown, fallback: (e: unknown) => string): string {
    if (err instanceof ApiError && err.status === 409 && /no account/i.test(err.message)) return 'verein.err.unlinkNoAccount';
    return fallback(err);
}

/** Error key for the member's own cancellation: the owner gets the owner explanation instead of a board message. */
export function selfExitErrorKey(err: unknown, fallback: (e: unknown) => string): string {
    if (errorDetailsCode(err) === 'owner_protected') return 'verein.exit.owner';
    return fallback(err);
}

/** Removes a stashed invitation token from this tab and from localStorage (sign-out, accepted, invalid). */
export function clearAllStoredInviteTokens(): void {
    if (typeof window === 'undefined') return;
    const stores: TokenStore[] = [];
    safely(() => stores.push(window.sessionStorage));
    safely(() => stores.push(window.localStorage));
    clearInviteToken(stores);
    for (const store of stores) safely(() => store.removeItem(INVITE_LOGIN_REDIRECT_KEY));
}
