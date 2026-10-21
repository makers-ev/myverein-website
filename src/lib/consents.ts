import { ApiError } from './api-client';
import { memberErrorKey } from './clubMembers';

/**
 * Consents (Wave 10): purposes with versioned texts, the per-person state and the board overview.
 *
 * Koppelungsverbot (Art. 7 Abs. 4 DSGVO): a consent is ALWAYS voluntary. `requested` only means "the club asks for it at
 * joining and reminds about it" -- it never blocks anything, and the UI never calls it a duty ("Pflicht"). Declining has no
 * consequence for membership, forms, accounts or any feature.
 */

export type ConsentState = 'granted' | 'revoked' | 'none';

export interface ConsentText {
    id: string;
    version: number;
    body: string;
    sha256: string;
    publishedAt: string | null;
    publishedBy?: string | null;
}

export interface ConsentPurpose {
    id: string;
    key: string;
    name: string;
    description: string | null;
    system: boolean;
    /** "Wird angefragt" (voluntary): drives the open list and reminders, nothing else. */
    requested: boolean;
    active: boolean;
    minAge: number | null;
    sortOrder: number;
    archivedAt: string | null;
    currentText: ConsentText | null;
}

/** One purpose for one person (`GET /club-members/:id/consents`, `GET /guardian/wards/:id/consents`). */
export interface MemberConsent {
    purposeId: string;
    key: string;
    name: string;
    description: string | null;
    requested: boolean;
    state: ConsentState;
    /** Requested and not yet decided (a reminder candidate, never a blocker). */
    open: boolean;
    text: { id: string; version: number; body: string };
    recordedTextVersion: number | null;
    /** Decided against an older text version: the person may look at the new wording and decide again. */
    outdated: boolean;
    givenBy: string | null;
    decidedAt: string | null;
}

export interface MemberConsentsResponse {
    clubMemberId: string;
    consents: MemberConsent[];
    open: number;
}

export interface OverviewPurpose {
    id: string;
    key: string;
    name: string;
    requested: boolean;
    counts: { granted: number; revoked: number; none: number };
}

export interface OverviewMember {
    clubMemberId: string;
    displayName: string;
    accountLinked: boolean;
    states: Record<string, { state: ConsentState; needsGuardian: boolean }>;
}

export interface ConsentOverview {
    data: { purposes: OverviewPurpose[]; members: OverviewMember[] };
    meta: { total: number; page: number; pageSize: number };
}

export const OVERVIEW_PAGE_SIZE = 50;

export interface OverviewFilter {
    q: string;
    purposeId: string;
    state: ConsentState | '';
    page: number;
}

/** Query string of `GET /consents/overview`; `state` is only sent together with a purpose (the backend requires it). */
export function overviewQuery(clubId: string, f: OverviewFilter): string {
    const params = new URLSearchParams({ clubId, page: String(f.page), pageSize: String(OVERVIEW_PAGE_SIZE) });
    if (f.q.trim()) params.set('q', f.q.trim());
    if (f.purposeId) {
        params.set('purposeId', f.purposeId);
        if (f.state) params.set('state', f.state);
    }
    return params.toString();
}

/** Translation key for a failed consent call: the `details.code` values first, then the generic mapping. */
export function consentErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        const code = (err.details as { code?: unknown } | undefined)?.code;
        switch (code) {
            case 'consent_text_outdated':
                return 'privacy.err.textOutdated';
            case 'consent_not_available':
                return 'privacy.err.notAvailable';
            case 'consent_requires_guardian':
                return 'privacy.err.requiresGuardian';
            case 'guardian_cannot_consent':
                return 'privacy.err.guardianCannot';
            case 'proof_required':
                return 'privacy.err.proofRequired';
            case 'no_published_text':
                return 'privacy.err.noPublishedText';
            case 'system_purpose':
                return 'privacy.err.systemPurpose';
        }
    }
    return memberErrorKey(err);
}

export interface DiffPart {
    type: 'same' | 'add' | 'del';
    text: string;
}

/**
 * Word-level diff of two text versions (longest common subsequence over whitespace-separated words, texts are capped at
 * 5000 characters so the table stays small). Consecutive words of the same kind are merged into one part.
 */
export function diffWords(before: string, after: string): DiffPart[] {
    const a = before.split(/\s+/).filter(Boolean);
    const b = after.split(/\s+/).filter(Boolean);
    const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) {
        for (let j = b.length - 1; j >= 0; j--) {
            lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
        }
    }
    const parts: DiffPart[] = [];
    const push = (type: DiffPart['type'], word: string) => {
        const last = parts[parts.length - 1];
        if (last && last.type === type) last.text += ` ${word}`;
        else parts.push({ type, text: word });
    };
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            push('same', a[i]!);
            i++;
            j++;
        } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) push('del', a[i++]!);
        else push('add', b[j++]!);
    }
    while (i < a.length) push('del', a[i++]!);
    while (j < b.length) push('add', b[j++]!);
    return parts;
}

/** Texts are 10-5000 characters (backend `consent_texts` limits). */
export const TEXT_MIN = 10;
export const TEXT_MAX = 5000;

/** Pre-filled reminder for the open consents of a purpose, handed to the announcement composer (Wave 9 mechanism). */
export interface ReminderPrefill {
    title: string;
    body: string;
    members: { id: string; name: string }[];
}

export const REMINDER_STORAGE_KEY = 'myverein.consentReminder';

/** Stores the prefill for `/mitteilungen`; storage errors are tolerated (the reminder is then just not pre-filled). */
export function stashReminder(prefill: ReminderPrefill): boolean {
    try {
        sessionStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(prefill));
        return true;
    } catch {
        return false;
    }
}

/** Reads and clears the stashed prefill; anything malformed is ignored. */
export function takeReminder(): ReminderPrefill | null {
    try {
        const raw = sessionStorage.getItem(REMINDER_STORAGE_KEY);
        if (!raw) return null;
        sessionStorage.removeItem(REMINDER_STORAGE_KEY);
        const v = JSON.parse(raw) as Partial<ReminderPrefill>;
        if (typeof v.title !== 'string' || typeof v.body !== 'string' || !Array.isArray(v.members)) return null;
        const members = v.members.filter((m): m is { id: string; name: string } => !!m && typeof m.id === 'string' && typeof m.name === 'string');
        return members.length > 0 ? { title: v.title, body: v.body, members } : null;
    } catch {
        return null;
    }
}
