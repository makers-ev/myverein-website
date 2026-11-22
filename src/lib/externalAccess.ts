import { ApiError } from './api-client';

/**
 * External logins of a club (Wave 15 B2): sponsors and service providers. Board only (`roles:write`, the backend checks again).
 * Pure helpers for the board panel (`components/verein/ExternalAccessPanel.tsx`) and the acceptance page (`/einladung/extern`).
 */

export const EXTERNAL_ACCESS_PERMISSION = 'roles:write';
export const EXTERNAL_ROLES = ['sponsor', 'dienstleister'] as const;
export type ExternalRole = (typeof EXTERNAL_ROLES)[number];
export const isExternalRole = (v: unknown): v is ExternalRole => (EXTERNAL_ROLES as readonly unknown[]).includes(v);

export interface Assignment {
    id: string;
    title: string;
    note: string | null;
    validFrom: string;
    validUntil: string;
    active: boolean;
    location: { id: string; name: string; address: string | null } | null;
}

export interface ExternalAccount {
    memberId: string;
    name: string;
    email: string;
    roleTypes: ExternalRole[];
    sponsors: { id: string; name: string }[];
    assignments: Assignment[];
}

export type InviteStatus = 'pending' | 'expired' | 'accepted' | 'revoked';

export interface ExternalInvite {
    id: string;
    email: string;
    roleType: ExternalRole;
    displayName: string;
    sponsor: { id: string; name: string } | null;
    status: InviteStatus;
    expiresAt: string;
}

/** One line of the board list: an open/expired/revoked invitation or an active account. */
export type ExternalRow =
    | { kind: 'invite'; id: string; email: string; name: string; role: ExternalRole; status: 'eingeladen' | 'abgelaufen' | 'widerrufen'; sponsor: string | null; invite: ExternalInvite }
    | { kind: 'account'; id: string; email: string; name: string; role: ExternalRole; status: 'aktiv'; sponsor: string | null; account: ExternalAccount };

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function normalizeAssignment(x: unknown): Assignment | null {
    const o = rec(x);
    const loc = rec(o.location);
    if (!str(o.id) || !str(o.validFrom) || !str(o.validUntil)) return null;
    return {
        id: str(o.id),
        title: str(o.title),
        note: str(o.note) || null,
        validFrom: str(o.validFrom),
        validUntil: str(o.validUntil),
        active: o.active === true,
        location: str(loc.id) ? { id: str(loc.id), name: str(loc.name), address: str(loc.address) || null } : null,
    };
}

export function normalizeExternalData(data: unknown): { invites: ExternalInvite[]; accounts: ExternalAccount[] } {
    const d = rec(data);
    const invites = arr(d.invites).flatMap((x): ExternalInvite[] => {
        const o = rec(x);
        const sponsor = rec(o.sponsor);
        const status = str(o.status) as InviteStatus;
        if (!str(o.id) || !isExternalRole(o.roleType) || !['pending', 'expired', 'accepted', 'revoked'].includes(status)) return [];
        return [{ id: str(o.id), email: str(o.email), roleType: o.roleType, displayName: str(o.displayName), sponsor: str(sponsor.id) ? { id: str(sponsor.id), name: str(sponsor.name) } : null, status, expiresAt: str(o.expiresAt) }];
    });
    const accounts = arr(d.accounts).flatMap((x): ExternalAccount[] => {
        const o = rec(x);
        if (!str(o.memberId)) return [];
        return [
            {
                memberId: str(o.memberId),
                name: str(o.name),
                email: str(o.email),
                roleTypes: arr(o.roleTypes).filter(isExternalRole),
                sponsors: arr(o.sponsors).flatMap((s) => (str(rec(s).id) ? [{ id: str(rec(s).id), name: str(rec(s).name) }] : [])),
                assignments: arr(o.assignments).flatMap((a) => {
                    const n = normalizeAssignment(a);
                    return n ? [n] : [];
                }),
            },
        ];
    });
    return { invites, accounts };
}

/** Accepted invitations are not listed twice: their account is. Accounts first, then open invitations, then the rest. */
export function buildRows(invites: readonly ExternalInvite[], accounts: readonly ExternalAccount[]): ExternalRow[] {
    const rows: ExternalRow[] = [];
    for (const a of accounts) {
        for (const role of a.roleTypes) rows.push({ kind: 'account', id: `${a.memberId}-${role}`, email: a.email, name: a.name, role, status: 'aktiv', sponsor: a.sponsors[0]?.name ?? null, account: a });
    }
    const order = { pending: 0, expired: 1, revoked: 2 } as const;
    const open = invites
        .filter((i): i is ExternalInvite & { status: 'pending' | 'expired' | 'revoked' } => i.status !== 'accepted')
        .sort((a, b) => order[a.status] - order[b.status]);
    for (const i of open) {
        rows.push({ kind: 'invite', id: i.id, email: i.email, name: i.displayName, role: i.roleType, status: i.status === 'pending' ? 'eingeladen' : i.status === 'expired' ? 'abgelaufen' : 'widerrufen', sponsor: i.sponsor?.name ?? null, invite: i });
    }
    return rows;
}

export const canResend = (i: ExternalInvite): boolean => i.status === 'pending' || i.status === 'expired';
export const canRevoke = (i: ExternalInvite): boolean => i.status === 'pending' || i.status === 'expired';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface InviteForm {
    email: string;
    displayName: string;
    roleType: ExternalRole;
    sponsorId: string;
}

export const emptyInviteForm = (): InviteForm => ({ email: '', displayName: '', roleType: 'sponsor', sponsorId: '' });

/** Translation key of the first problem of the invite form, or `null`. */
export function inviteProblem(f: InviteForm): string | null {
    if (!f.displayName.trim()) return 'ext.err.name';
    if (!EMAIL.test(f.email.trim()) || f.email.trim().length > 320) return 'ext.err.email';
    return null;
}

export function inviteBody(f: InviteForm) {
    return { email: f.email.trim().toLowerCase(), roleType: f.roleType, displayName: f.displayName.trim(), ...(f.roleType === 'sponsor' && f.sponsorId ? { sponsorId: f.sponsorId } : {}) };
}

// ----- Assignments (service providers) -----

export interface AssignmentForm {
    title: string;
    note: string;
    locationId: string;
    /** `datetime-local` values (browser time zone). */
    validFrom: string;
    validUntil: string;
}

const MAX_WINDOW_MS = 366 * 24 * 3600 * 1000;

export const emptyAssignmentForm = (): AssignmentForm => ({ title: '', note: '', locationId: '', validFrom: '', validUntil: '' });

const pad = (n: number) => String(n).padStart(2, '0');
/** ISO instant -> `datetime-local` value in the browser's time zone. */
export function toLocalInput(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formFromAssignment(a: Assignment): AssignmentForm {
    return { title: a.title, note: a.note ?? '', locationId: a.location?.id ?? '', validFrom: toLocalInput(a.validFrom), validUntil: toLocalInput(a.validUntil) };
}

/** Translation key of the first problem of an assignment (window must be ordered and at most 366 days). */
export function assignmentProblem(f: AssignmentForm): string | null {
    if (!f.title.trim()) return 'ext.assign.err.title';
    const from = new Date(f.validFrom).getTime();
    const until = new Date(f.validUntil).getTime();
    if (!f.validFrom || !f.validUntil || Number.isNaN(from) || Number.isNaN(until)) return 'ext.assign.err.window';
    if (until <= from) return 'ext.assign.err.order';
    if (until - from > MAX_WINDOW_MS) return 'ext.assign.err.long';
    return null;
}

export function assignmentBody(f: AssignmentForm) {
    return {
        title: f.title.trim(),
        note: f.note.trim() ? f.note.trim() : null,
        locationId: f.locationId || null,
        validFrom: new Date(f.validFrom).toISOString(),
        validUntil: new Date(f.validUntil).toISOString(),
    };
}

/** Plain-language key for a failed board request. */
export function externalErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        const code = (err.details as { code?: unknown } | undefined)?.code;
        if (code === 'invite_not_open') return 'ext.err.notOpen';
        if (code === 'not_service_provider') return 'ext.assign.err.notProvider';
        if (code === 'unknown_location') return 'ext.assign.err.location';
        if (code === 'unknown_sponsor') return 'ext.err.sponsor';
        if (code === 'sponsor_only_for_sponsor_role') return 'ext.err.sponsorRole';
        if (err.status === 429) return 'ext.err.rate';
        if (err.status === 404) return 'ext.err.gone';
        if (err.status === 403) return 'err.forbidden';
        if (err.status === 422 || err.status === 400) return 'ext.err.invalid';
    }
    return 'ext.err.generic';
}

// ----- Acceptance page (`/einladung/extern`) -----

export const EXTERNAL_TOKEN_KEY = 'myverein.externalInviteToken';
export const EXTERNAL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const INVALID_EXTERNAL_LINK = 'invalid-link';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function isPlausibleToken(v: string | null | undefined): v is string {
    return typeof v === 'string' && v.length >= 16 && v.length <= 200 && /^[A-Za-z0-9_-]+$/.test(v);
}

function safely<T>(f: () => T): T | null {
    try {
        return f();
    } catch {
        return null;
    }
}

/**
 * Token of the invitation link: the query wins and is stashed (24 h) so it survives the sign-in round trip and a verification mail
 * opened in another tab; a broken `?token=` never falls back to an older stashed one. Own storage key, separate from member invites.
 */
export function resolveExternalToken(search: string, stores: Store[], now: number = Date.now()): string | null {
    const q = new URLSearchParams(search).get('token');
    if (q && !isPlausibleToken(q)) return INVALID_EXTERNAL_LINK;
    if (isPlausibleToken(q)) {
        const value = JSON.stringify({ token: q, exp: now + EXTERNAL_TOKEN_TTL_MS });
        for (const s of stores) safely(() => s.setItem(EXTERNAL_TOKEN_KEY, value));
        return q;
    }
    for (const s of stores) {
        const raw = safely(() => s.getItem(EXTERNAL_TOKEN_KEY));
        if (!raw) continue;
        try {
            const p = JSON.parse(raw) as { token?: unknown; exp?: unknown };
            if (typeof p.exp === 'number' && p.exp > now && typeof p.token === 'string' && isPlausibleToken(p.token)) return p.token;
        } catch {
            // unreadable entry
        }
        safely(() => s.removeItem(EXTERNAL_TOKEN_KEY));
    }
    return null;
}

export function clearExternalToken(stores: Store[]): void {
    for (const s of stores) safely(() => s.removeItem(EXTERNAL_TOKEN_KEY));
}

export interface ExternalPreview {
    clubId: string;
    clubName: string | null;
    roleType: ExternalRole;
    displayName: string;
    invitedEmail: string;
    emailMatches: boolean;
    expiresAt: string;
}

export function normalizePreview(data: unknown): ExternalPreview | null {
    const o = rec(data);
    if (!isExternalRole(o.roleType)) return null;
    return { clubId: str(o.clubId), clubName: str(o.clubName) || null, roleType: o.roleType, displayName: str(o.displayName), invitedEmail: str(o.invitedEmail), emailMatches: o.emailMatches === true, expiresAt: str(o.expiresAt) };
}

/** Outcome of a failed preview/accept for the page: which text to show and whether the token should be dropped. */
export function acceptFailure(err: unknown): { textKey: string; drop: boolean; retry: boolean } {
    if (err instanceof ApiError) {
        const code = (err.details as { code?: unknown } | undefined)?.code;
        if (err.status === 403 && (err.code === 'CLUB_SUSPENDED' || code === 'club_suspended')) return { textKey: 'err.clubSuspended', drop: false, retry: false };
        if (err.status === 403) return { textKey: 'ext.accept.err.email', drop: false, retry: false };
        // `invite_not_found` (unknown, expired, used or revoked) and a plain 404 look the same on purpose.
        if (err.status === 404 || code === 'invite_not_found') return { textKey: 'ext.accept.invalid.body', drop: true, retry: false };
        if (err.status === 409) return { textKey: 'ext.accept.err.excluded', drop: false, retry: false };
        if (err.status === 429) return { textKey: 'ext.accept.err.rate', drop: false, retry: true };
    }
    return { textKey: 'ext.accept.err.generic', drop: false, retry: true };
}
