import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
vi.mock('@/lib/auth-client', () => ({ authClient: { $fetch: (...args: unknown[]) => fetchMock(...args) }, backendUrl: 'http://backend.test' }));

import { ApiError, apiFetch, cachePolicyFor, DPA_REQUIRED_EVENT, parseJsonPlain } from './api-client';

beforeEach(() => fetchMock.mockReset());

describe('apiFetch error parsing', () => {
    it('reads the Hono backend format { error: { code, message, details } }', async () => {
        fetchMock.mockResolvedValue({
            data: null,
            error: { status: 409, statusText: 'Conflict', error: { code: 'CONFLICT', message: 'Status change aktiv -> probe is not allowed', details: { allowed: ['ruhend'] } } },
        });
        const err = (await apiFetch('/x').catch((e: unknown) => e)) as ApiError;
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(409);
        expect(err.code).toBe('CONFLICT');
        expect(err.message).toBe('Status change aktiv -> probe is not allowed');
        expect(err.details).toEqual({ allowed: ['ruhend'] });
    });

    it('still reads the flat Better Auth format { code, message }', async () => {
        fetchMock.mockResolvedValue({ data: null, error: { status: 401, statusText: 'Unauthorized', code: 'INVALID_TOKEN', message: 'Invalid token' } });
        const err = (await apiFetch('/x').catch((e: unknown) => e)) as ApiError;
        expect(err.code).toBe('INVALID_TOKEN');
        expect(err.message).toBe('Invalid token');
        expect(err.details).toBeUndefined();
    });

    it('falls back to defaults for an empty error body and passes data through on success', async () => {
        fetchMock.mockResolvedValueOnce({ data: null, error: { status: 502, statusText: 'Bad Gateway' } });
        const err = (await apiFetch('/x').catch((e: unknown) => e)) as ApiError;
        expect(err.code).toBe('UNKNOWN');
        expect(err.message).toBe('Request failed');
        fetchMock.mockResolvedValueOnce({ data: { ok: true }, error: null });
        await expect(apiFetch('/y')).resolves.toEqual({ ok: true });
    });
});

describe('apiFetch date handling', () => {
    it('hands better-fetch a plain parser, so ISO date strings stay strings (its default revives them into Date objects)', async () => {
        const iso = '2026-10-12T10:00:00.000Z';
        fetchMock.mockResolvedValue({ data: { data: { expiresAt: iso } }, error: null });
        await apiFetch('/club-members/invites/preview', { method: 'POST', body: { token: 'x' } });
        const options = fetchMock.mock.calls[0]![1] as { jsonParser: (text: string) => unknown };
        const parsed = options.jsonParser(JSON.stringify({ data: { expiresAt: iso, day: '2026-10-12' } })) as { data: { expiresAt: unknown; day: unknown } };
        expect(parsed.data.expiresAt).toBe(iso);
        expect(typeof parsed.data.expiresAt).toBe('string');
        expect(parsed.data.day).toBe('2026-10-12');
    });

    it('parses plain JSON, an empty body as null', () => {
        expect(parseJsonPlain('{"a":"2026-10-12T10:00:00.000Z"}')).toEqual({ a: '2026-10-12T10:00:00.000Z' });
        expect(parseJsonPlain('')).toBeNull();
    });
});

describe('cache policy of document routes', () => {
    it('never uses the HTTP cache for the archive, personal storage, generation, acknowledgements, cards, storage and branding', () => {
        for (const path of ['/documents?clubId=c', '/documents/folders?clubId=c', '/documents/d1/download?clubId=c', '/member-documents/me?clubId=c', '/document-generation/jobs/j1?clubId=c', '/club-storage?clubId=c', '/club-settings/branding?clubId=c', '/club-settings/assembly?clubId=c', '/acknowledgements/mine?clubId=c', '/acknowledgements/a1?clubId=c', '/club-members/me/card?clubId=c', '/club-members/m1/card?clubId=c', '/club-members/me/card.pdf?clubId=c']) {
            expect(cachePolicyFor(path), path).toBe('no-store');
        }
        expect(cachePolicyFor('/club-settings?clubId=c')).toBeUndefined();
    });
});

describe('cache policy of personal-data routes', () => {
    it('never uses the HTTP cache for event attendance, registrations, helper plans, rides and time tracking', () => {
        for (const path of ['/events/e1/attendance?clubId=c', '/events/e1/registrations.csv?clubId=c', '/events/e1/registration?clubId=c', '/events/e1/rsvp?clubId=c', '/events/e1/helpers?clubId=c', '/events/e1/rides?clubId=c', '/events/e1/public-link?clubId=c', '/attendance/report?clubId=c', '/time-entries?clubId=c', '/rate-cards?clubId=c', '/time-report?clubId=c', '/public/events/tok']) {
            expect(cachePolicyFor(path), path).toBe('no-store');
        }
        expect(cachePolicyFor('/events/e1?clubId=c')).toBeUndefined();
    });

    it('never uses the HTTP cache for absences, guardian routes, consents and the access log', () => {
        for (const path of ['/absences?clubId=c', '/absences/club?clubId=c', '/my-wards', '/guardian/wards/w/events?clubId=c', '/consent-purposes?clubId=c', '/consents/overview?clubId=c', '/club-members/abc/consents?clubId=c', '/audit-log?clubId=c']) {
            expect(cachePolicyFor(path)).toBe('no-store');
        }
    });

    it('never uses the HTTP cache for exports, erasure, requests, retention, privacy notices and the DPA', () => {
        for (const path of ['/club-members/me/data-export?clubId=c', '/club-members/me/data-requests', '/club-members/abc/data-export', '/club-members/abc/erasure/plan', '/club-members/abc/legal-hold', '/club-members/abc/privacy-notice', '/data-subject-requests?clubId=c', '/retention-policies?clubId=c', '/retention-policies/preview', '/club-privacy-notices/current', '/clubs/demo/privacy-notice', '/dpa/current?clubId=c', '/admin/dpa-versions', '/admin/retention-runs?scope=all']) {
            expect(cachePolicyFor(path), path).toBe('no-store');
        }
        expect(cachePolicyFor('/dpaX')).toBeUndefined();
    });

    it('never uses the HTTP cache for the general assembly (ballots, elections, minutes, invitations, voting roll, rules)', () => {
        for (const path of ['/ballots?clubId=c', '/ballots/abc', '/elections/abc', '/club-roles/expiring?clubId=c', '/club-settings/assembly?clubId=c', '/meetings/abc/minutes?clubId=c', '/meetings/abc/invitations/latest', '/meetings/abc/voting-roll/me', '/meetings/abc/proxies', '/meetings/abc/quorum', '/meetings/abc/attendance', '/meetings/abc/resolutions?clubId=c', '/meetings/abc?clubId=c', '/meetings?clubId=c']) {
            expect(cachePolicyFor(path), path).toBe('no-store');
        }
        expect(cachePolicyFor('/meetingsX')).toBeUndefined();
        expect(cachePolicyFor('/ballotsX')).toBeUndefined();
    });

    it('announces a refused write of a club without processor agreement', async () => {
        const seen = vi.fn();
        const target = new EventTarget();
        vi.stubGlobal('window', target);
        target.addEventListener(DPA_REQUIRED_EVENT, seen);
        fetchMock.mockResolvedValue({ data: null, error: { status: 403, statusText: 'Forbidden', error: { code: 'DPA_REQUIRED', message: 'x', details: { code: 'dpa_required' } } } });
        await apiFetch('/x', { method: 'POST' }).catch(() => undefined);
        vi.unstubAllGlobals();
        expect(seen).toHaveBeenCalledTimes(1);
    });

    it('never uses the HTTP cache for form submissions, applicant forms and the application review', () => {
        for (const path of ['/form-submissions/mine', '/form-submissions/abc?x=1', '/club-forms/demo/aufnahme', '/club-applications?clubId=c', '/club-applications/1']) {
            expect(cachePolicyFor(path)).toBe('no-store');
        }
        expect(cachePolicyFor('/club-members?clubId=c')).toBeUndefined();
        expect(cachePolicyFor('/form-submissionsX')).toBeUndefined();
    });

    it('never uses the HTTP cache for the form editor, custom fields and exit requests', () => {
        for (const path of ['/forms?clubId=c', '/forms/1/draft?clubId=c', '/member-fields?clubId=c', '/club-members/me/custom-fields?clubId=c', '/club-members/abc/custom-fields?clubId=c', '/club-exit-requests/form?clubId=c', '/club-exit-requests/1', '/member-fields/catalog?clubId=c', '/club-members/credentials?clubId=c&status=expired', '/club-members/credentials', '/club-members/me/children?clubId=c']) {
            expect(cachePolicyFor(path), path).toBe('no-store');
        }
        expect(cachePolicyFor('/formsX')).toBeUndefined();
        expect(cachePolicyFor('/club-members/abc?clubId=c')).toBeUndefined();
        expect(cachePolicyFor('/club-members/credentialsX')).toBeUndefined();
    });

    it('passes the policy to the fetch call', async () => {
        fetchMock.mockResolvedValue({ data: { data: [] }, error: null });
        await apiFetch('/form-submissions/mine');
        expect(fetchMock.mock.calls[0]![1]).toMatchObject({ cache: 'no-store' });
        await apiFetch('/my-clubs');
        expect(fetchMock.mock.calls[1]![1]).not.toHaveProperty('cache');
    });
});
