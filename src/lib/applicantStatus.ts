import type { MySubmission, OnBehalfOf } from './formSchema';

/**
 * Applicant-facing helpers around `GET /form-submissions/mine` (Wave 8): what became of the person's applications
 * (decision message of the board), which drafts / pending applications can be resumed after a reload, and the last used
 * club code. Pure functions plus a fail-safe `localStorage` wrapper -- nothing but the (non-secret) club code is stored,
 * never an answer.
 */

export const LAST_CLUB_SLUG_KEY = 'myverein.lastClubSlug';
const SLUG_FORMAT = /^[a-z0-9][a-z0-9-]{0,79}$/;
export const DECIDED_LIMIT = 5;

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStore(): Store | null {
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        // Blocked storage (private mode, policy): the feature just does not remember.
        return null;
    }
}

/** The last used club code, or `''` (nothing stored, malformed value, storage unavailable). */
export function readLastClubSlug(store: Store | null = defaultStore()): string {
    try {
        const value = store?.getItem(LAST_CLUB_SLUG_KEY)?.trim().toLowerCase() ?? '';
        return SLUG_FORMAT.test(value) ? value : '';
    } catch {
        return '';
    }
}

export function rememberClubSlug(slug: string, store: Store | null = defaultStore()): void {
    const value = slug.trim().toLowerCase();
    if (!SLUG_FORMAT.test(value)) return;
    try {
        store?.setItem(LAST_CLUB_SLUG_KEY, value);
    } catch {
        // Quota / blocked storage: not remembering is fine.
    }
}

const stamp = (s: MySubmission): string => s.decidedAt ?? s.submittedAt ?? s.createdAt;
const newestFirst = (a: MySubmission, b: MySubmission): number => (stamp(a) < stamp(b) ? 1 : stamp(a) > stamp(b) ? -1 : 0);
const aufnahme = (mine: readonly MySubmission[]): MySubmission[] => mine.filter((m) => m.purpose === 'aufnahme');

export type DecidedStatus = 'rejected' | 'accepted' | 'withdrawn';
const DECIDED = new Set<string>(['rejected', 'accepted', 'withdrawn']);
export const isDecided = (status: string): status is DecidedStatus => DECIDED.has(status);

/** Decided applications of one club (rejected / accepted / withdrawn), newest first, only the most recent few. */
export function decidedSubmissions(mine: readonly MySubmission[], slug: string, limit = DECIDED_LIMIT): MySubmission[] {
    return aufnahme(mine)
        .filter((m) => m.club.slug === slug && isDecided(m.status))
        .sort(newestFirst)
        .slice(0, limit);
}

/** The message of the board to the applicant: plain text, `null` when there is none (it is rendered as text, never as HTML). */
export function decisionMessage(s: Pick<MySubmission, 'decisionNote'>): string | null {
    const note = typeof s.decisionNote === 'string' ? s.decisionNote.trim() : '';
    return note === '' ? null : note;
}

/** Drafts and pending (submitted) applications over all clubs, newest first: what "Offene Anträge" lists. */
export function openApplications(mine: readonly MySubmission[]): MySubmission[] {
    return aufnahme(mine)
        .filter((m) => (m.status === 'draft' || m.status === 'submitted') && m.club.slug !== '')
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

/** The newest open draft of the same club and applicant mode, or `undefined` (dedup: resume instead of creating a second draft). */
export function findOpenDraft(mine: readonly MySubmission[], slug: string, mode: OnBehalfOf): MySubmission | undefined {
    return aufnahme(mine)
        .filter((m) => m.status === 'draft' && m.club.slug === slug && m.onBehalfOf === mode)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))[0];
}

/**
 * The rejection to point out on /verein for a person without a club: the newest decided application, if it was rejected and
 * no newer application of the same club is open or decided (then the person has already moved on).
 */
export function latestRejection(mine: readonly MySubmission[]): MySubmission | null {
    const all = aufnahme(mine);
    const decided = all.filter((m) => isDecided(m.status)).sort(newestFirst)[0];
    if (!decided || decided.status !== 'rejected') return null;
    const moved = all.some((m) => m.id !== decided.id && m.club.slug === decided.club.slug && m.createdAt > decided.createdAt && m.status !== 'withdrawn');
    return moved ? null : decided;
}
