import { ApiError, DPA_REQUIRED_EVENT } from './api-client';
import { consentErrorKey } from './consents';

/**
 * Data protection beyond consents (Wave 10): the member's privacy file, own data export / erasure request, privacy notice,
 * retention rules, data subject requests and the processor agreement (AV-Vertrag). Pure helpers and API shapes; the
 * components do the rendering. Consents stay voluntary everywhere: nothing here makes a consent a condition.
 */

// ---------- data subject requests (B7) ----------

export type RequestKind = 'access' | 'erasure' | 'rectification';
export type RequestStatus = 'open' | 'in_progress' | 'done' | 'rejected';

export interface DataSubjectRequest {
    id: string;
    clubMemberId: string;
    memberName: string | null;
    kind: RequestKind;
    status: RequestStatus;
    receivedAt: string;
    dueAt: string;
    completedAt: string | null;
    result: string | null;
    daysLeft: number | null;
    overdue: boolean;
}

/** The own request list (`GET /club-members/me/data-requests`): no member name, no computed deadline. */
export type OwnDataRequest = Pick<DataSubjectRequest, 'id' | 'kind' | 'status' | 'receivedAt' | 'dueAt' | 'completedAt'>;

export const REQUEST_KINDS: readonly RequestKind[] = ['access', 'erasure', 'rectification'];
export const REQUEST_STATUSES: readonly RequestStatus[] = ['open', 'in_progress', 'done', 'rejected'];

export const isOpenRequest = (r: Pick<DataSubjectRequest, 'status'>): boolean => r.status === 'open' || r.status === 'in_progress';

export type LightTone = 'success' | 'warning' | 'destructive' | 'muted';

/**
 * Traffic light of a request deadline (one month by law): overdue or at most 3 days left is red, up to 14 days yellow,
 * otherwise green. A closed request has no light.
 */
export function deadlineTone(r: Pick<DataSubjectRequest, 'status' | 'daysLeft' | 'overdue'>): LightTone {
    if (!isOpenRequest(r)) return 'muted';
    if (r.overdue || (r.daysLeft !== null && r.daysLeft <= 3)) return 'destructive';
    if (r.daysLeft !== null && r.daysLeft <= 14) return 'warning';
    return 'success';
}

// ---------- erasure (B8) ----------

export const ERASURE_BLOCKERS = ['legal_hold', 'exit_pending', 'open_loans', 'board_role', 'sole_owner'] as const;
export type ErasureBlockerCode = (typeof ERASURE_BLOCKERS)[number];

export interface ErasureStep {
    key: string;
    deleted: number;
    anonymized: number;
    kept: number;
    keptReason?: string;
}

export interface ErasurePlan {
    clubMemberId: string;
    displayName: string;
    blockers: { code: string; message: string }[];
    steps: ErasureStep[];
    planDigest: string;
}

export const isBlocker = (code: string): code is ErasureBlockerCode => (ERASURE_BLOCKERS as readonly string[]).includes(code);

/** Translation key of a blocker; an unknown code falls back to a generic text (never the English server message). */
export const erasureBlockerKey = (code: string): string => (isBlocker(code) ? `privacy.erasure.blocker.${code}` : 'privacy.erasure.blocker.unknown');

/**
 * Account deletion (`/api/auth/delete-user`) runs the same erasure; a blocker answers 400 with the Better Auth style code
 * `ERASURE_<BLOCKER>`. Returns the translation key, or null if the error is not an erasure blocker.
 */
export function accountDeletionErrorKey(code: string | null | undefined): string | null {
    if (!code || !code.startsWith('ERASURE_')) return null;
    return erasureBlockerKey(code.slice('ERASURE_'.length).toLowerCase());
}

// ---------- DPA gate (B10) ----------

export { DPA_REQUIRED_EVENT };

/** A write refused because the club has not accepted the processor agreement in time (`403 DPA_REQUIRED`). */
export function isDpaRequired(err: unknown): boolean {
    return err instanceof ApiError && err.status === 403 && (err.code === 'DPA_REQUIRED' || (err.details as { code?: unknown } | undefined)?.code === 'dpa_required');
}

export interface DpaSubprocessor {
    name: string;
    purpose: string;
    location: string;
}

export interface DpaVersion {
    id: string;
    version: number;
    title: string;
    body: string;
    subprocessors: DpaSubprocessor[];
    tomAnnex: string | null;
    sha256: string;
    requiredFrom: string | null;
    publishedAt: string;
}

export interface DpaStatus {
    required: boolean;
    version: number | null;
    accepted: boolean;
    acceptedAt: string | null;
    signerName: string | null;
    mandatoryFrom: string | null;
    deadline: string | null;
    daysLeft: number | null;
    blocked: boolean;
}

export interface DpaCurrent {
    version: DpaVersion | null;
    status: DpaStatus;
    canAccept: boolean;
}

export type DpaBannerKind = 'blocked' | 'grace' | 'open' | null;

/** What the banner says: writing is locked now, a deadline is running, or a version is simply waiting for the owner. */
export function dpaBannerKind(current: DpaCurrent | null): DpaBannerKind {
    if (!current || !current.version || current.status.accepted) return null;
    if (current.status.blocked) return 'blocked';
    if (current.status.required && current.status.daysLeft !== null) return 'grace';
    return 'open';
}

export const SIGNER_MIN = 2;
export const SIGNER_MAX = 200;

// ---------- privacy notice (B11) ----------

export interface PrivacyNotice {
    id: string;
    version: number;
    body: string;
    sha256: string;
    publishedAt: string;
}

export interface PrivacyNoticeListItem {
    id: string;
    version: number;
    sha256: string;
    publishedAt: string;
    publishedBy: string | null;
}

export interface PrivacyNoticeStatus {
    sentAt: string | null;
    sentVersion: number | null;
    currentVersion: number | null;
    upToDate: boolean;
}

export const NOTICE_MIN = 100;
export const NOTICE_MAX = 50000;

/** The word diff is quadratic; very long texts are shown without a comparison instead of freezing the browser. */
export const DIFF_MAX_WORDS = 2500;

export function canDiff(before: string, after: string): boolean {
    const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
    return words(before) <= DIFF_MAX_WORDS && words(after) <= DIFF_MAX_WORDS;
}

// ---------- retention (B9) ----------

export interface RetentionRule {
    category: string;
    scope: 'club' | 'platform';
    label: string;
    description: string;
    defaultDays: number;
    minDays: number;
    maxDays: number;
    effectiveDays: number;
    overridden: boolean;
    editable: boolean;
}

export interface RetentionPolicies {
    dryRun: boolean;
    noticeDays: number;
    rules: RetentionRule[];
}

export interface RetentionPreviewItem {
    category: string;
    label: string;
    due: number;
}

/** Validates a retention period against the rule's bounds; returns the translation key of the problem or null. */
export function retentionProblem(rule: Pick<RetentionRule, 'minDays' | 'maxDays'>, raw: string): string | null {
    if (!/^\d+$/.test(raw.trim())) return 'privacy.retention.err.number';
    const n = Number(raw);
    return n < rule.minDays || n > rule.maxDays ? 'privacy.retention.err.bounds' : null;
}

/** "730 days" shown as years when it is a whole number of years, else days. */
export function daysLabel(days: number): { unit: 'years' | 'days'; count: number } {
    return days >= 365 && days % 365 === 0 ? { unit: 'years', count: days / 365 } : { unit: 'days', count: days };
}

// ---------- field visibility (B12) ----------

export const VISIBILITY_FIELDS = ['phone', 'email', 'address', 'photo'] as const;
export type VisibilityField = (typeof VISIBILITY_FIELDS)[number];
export const VISIBILITY_LEVELS = ['nur_vorstand', 'trainer', 'mitglieder'] as const;
export type VisibilityLevel = (typeof VISIBILITY_LEVELS)[number];

export type Visibility = Record<VisibilityField, VisibilityLevel>;

/** The server answers the levels per field; anything missing or unknown is read as the safe default (board only). */
export function normalizeVisibility(raw: unknown): Visibility {
    const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const out = {} as Visibility;
    for (const f of VISIBILITY_FIELDS) {
        const v = src[f];
        out[f] = (VISIBILITY_LEVELS as readonly unknown[]).includes(v) ? (v as VisibilityLevel) : 'nur_vorstand';
    }
    return out;
}

// ---------- errors ----------

/** Translation key for a failed privacy call: this module's detail codes first, then the consent codes, then the generic mapping. */
export function privacyErrorKey(err: unknown): string {
    if (isDpaRequired(err)) return 'privacy.err.dpaRequired';
    if (err instanceof ApiError) {
        const details = err.details as { code?: unknown } | undefined;
        const code = typeof details?.code === 'string' ? details.code : err.code;
        if (isBlocker(code)) return erasureBlockerKey(code);
        switch (code) {
            case 'plan_outdated':
                return 'privacy.err.planOutdated';
            case 'already_closed':
                return 'privacy.err.alreadyClosed';
            case 'out_of_bounds':
                return 'privacy.retention.err.bounds';
            case 'not_editable':
                return 'privacy.retention.err.notEditable';
            case 'no_published_notice':
                return 'privacy.err.noPublishedNotice';
            case 'notice_length':
                return 'privacy.notice.err.length';
            case 'version_published':
                return 'privacy.err.versionPublished';
            case 'dpa_version_outdated':
                return 'privacy.dpa.err.outdated';
        }
        if (err.status === 429) return 'privacy.err.rateLimit';
    }
    return consentErrorKey(err);
}
