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

/** Minimal slice of `Storage` so the helpers below work with `sessionStorage` and with a test double. */
export interface TokenStore {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

/**
 * Token of the invitation link: the query string wins (and is stashed so it survives the login round trip), else the
 * stashed one. The caller strips the token from the visible URL afterwards (`history.replaceState`).
 */
export function resolveInviteToken(search: string, store: TokenStore): string | null {
    const fromQuery = new URLSearchParams(search).get('token');
    if (isPlausibleInviteToken(fromQuery)) {
        store.setItem(INVITE_TOKEN_STORAGE_KEY, fromQuery);
        return fromQuery;
    }
    const stashed = store.getItem(INVITE_TOKEN_STORAGE_KEY);
    return isPlausibleInviteToken(stashed) ? stashed : null;
}

export function clearInviteToken(store: TokenStore): void {
    store.removeItem(INVITE_TOKEN_STORAGE_KEY);
}
