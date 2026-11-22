import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import {
    acceptFailure,
    assignmentBody,
    assignmentProblem,
    buildRows,
    canResend,
    clearExternalToken,
    emptyAssignmentForm,
    emptyInviteForm,
    externalErrorKey,
    INVALID_EXTERNAL_LINK,
    inviteBody,
    inviteProblem,
    normalizeExternalData,
    resolveExternalToken,
    toLocalInput,
} from './externalAccess';

const memStore = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};
const TOKEN = 'abcdefghijklmnopqrstuvwxyz012345';

const data = normalizeExternalData({
    invites: [
        { id: 'i1', email: 'a@x.de', roleType: 'sponsor', displayName: 'A', sponsor: { id: 's1', name: 'Bäcker' }, status: 'pending', expiresAt: '2026-12-01T00:00:00Z' },
        { id: 'i2', email: 'b@x.de', roleType: 'dienstleister', displayName: 'B', sponsor: null, status: 'accepted', expiresAt: '2026-12-01T00:00:00Z' },
        { id: 'i3', email: 'c@x.de', roleType: 'sponsor', displayName: 'C', sponsor: null, status: 'revoked', expiresAt: '2026-12-01T00:00:00Z' },
        { id: 'i4', email: 'd@x.de', roleType: 'admin', displayName: 'D', status: 'pending' },
    ],
    accounts: [{ memberId: 'm1', name: 'B', email: 'b@x.de', roleTypes: ['dienstleister', 'quatsch'], sponsors: [], assignments: [{ id: 'a1', title: 'Heizung', note: null, validFrom: '2026-12-01T08:00:00Z', validUntil: '2026-12-01T10:00:00Z', active: false, location: { id: 'l1', name: 'Halle', address: null } }] }],
});

describe('list', () => {
    it('drops unknown roles and rows, lists accepted invitations only as accounts', () => {
        expect(data.invites).toHaveLength(3);
        expect(data.accounts[0]!.roleTypes).toEqual(['dienstleister']);
        const rows = buildRows(data.invites, data.accounts);
        expect(rows.map((r) => `${r.status}:${r.email}`)).toEqual(['aktiv:b@x.de', 'eingeladen:a@x.de', 'widerrufen:c@x.de']);
    });
    it('only open or expired invitations can be resent', () => {
        expect(canResend(data.invites[0]!)).toBe(true);
        expect(canResend(data.invites[1]!)).toBe(false);
        expect(canResend(data.invites[2]!)).toBe(false);
    });
});

describe('invite form', () => {
    it('needs a name and an e-mail address, sends the sponsor link for sponsors only', () => {
        expect(inviteProblem(emptyInviteForm())).toBe('ext.err.name');
        expect(inviteProblem({ ...emptyInviteForm(), displayName: 'X', email: 'kaputt' })).toBe('ext.err.email');
        const ok = { ...emptyInviteForm(), displayName: ' X ', email: ' A@X.de ', sponsorId: 's1' };
        expect(inviteProblem(ok)).toBeNull();
        expect(inviteBody(ok)).toEqual({ email: 'a@x.de', roleType: 'sponsor', displayName: 'X', sponsorId: 's1' });
        expect(inviteBody({ ...ok, roleType: 'dienstleister' })).not.toHaveProperty('sponsorId');
    });
});

describe('assignment form', () => {
    const base = { ...emptyAssignmentForm(), title: 'Heizung', validFrom: '2026-12-01T08:00', validUntil: '2026-12-01T10:00' };
    it('checks the window like the backend (ordered, at most 366 days)', () => {
        expect(assignmentProblem(emptyAssignmentForm())).toBe('ext.assign.err.title');
        expect(assignmentProblem({ ...base, validFrom: '' })).toBe('ext.assign.err.window');
        expect(assignmentProblem({ ...base, validUntil: '2026-12-01T08:00' })).toBe('ext.assign.err.order');
        expect(assignmentProblem({ ...base, validUntil: '2028-01-01T08:00' })).toBe('ext.assign.err.long');
        expect(assignmentProblem(base)).toBeNull();
    });
    it('builds ISO instants and clears empty fields', () => {
        const b = assignmentBody({ ...base, note: ' ', locationId: '' });
        expect(b.note).toBeNull();
        expect(b.locationId).toBeNull();
        expect(b.validFrom).toMatch(/Z$/);
    });
    it('round-trips a local value', () => {
        expect(toLocalInput(new Date(2026, 11, 1, 8, 30).toISOString())).toBe('2026-12-01T08:30');
        expect(toLocalInput('nope')).toBe('');
    });
});

describe('errors', () => {
    it('maps backend codes', () => {
        expect(externalErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'invite_not_open' }))).toBe('ext.err.notOpen');
        expect(externalErrorKey(new ApiError(422, 'X', 'x', { code: 'not_service_provider' }))).toBe('ext.assign.err.notProvider');
        expect(externalErrorKey(new ApiError(429, 'X', 'x'))).toBe('ext.err.rate');
        expect(externalErrorKey(new Error('net'))).toBe('ext.err.generic');
    });
    it('explains acceptance failures, incl. a suspended club', () => {
        expect(acceptFailure(new ApiError(404, 'NOT_FOUND', 'x'))).toMatchObject({ drop: true });
        expect(acceptFailure(new ApiError(403, 'CLUB_SUSPENDED', 'x', { code: 'club_suspended' }))).toEqual({ textKey: 'err.clubSuspended', drop: false, retry: false });
        expect(acceptFailure(new ApiError(403, 'FORBIDDEN', 'x'))).toMatchObject({ textKey: 'ext.accept.err.email', drop: false });
        expect(acceptFailure(new ApiError(429, 'X', 'x'))).toMatchObject({ retry: true });
    });
});

describe('token stash', () => {
    it('keeps the link token across the sign-in round trip, with its own key', () => {
        const s = memStore();
        expect(resolveExternalToken(`?token=${TOKEN}`, [s])).toBe(TOKEN);
        expect(resolveExternalToken('', [s])).toBe(TOKEN);
        clearExternalToken([s]);
        expect(resolveExternalToken('', [s])).toBeNull();
    });
    it('does not fall back to an older token for a broken link and expires after 24 hours', () => {
        const s = memStore();
        resolveExternalToken(`?token=${TOKEN}`, [s], 1000);
        expect(resolveExternalToken('?token=kurz', [s])).toBe(INVALID_EXTERNAL_LINK);
        expect(resolveExternalToken('', [s], 1000 + 25 * 3600 * 1000)).toBeNull();
    });
});
