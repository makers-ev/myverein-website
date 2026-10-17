import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));

import { ApiError } from './api-client';
import {
    asOverview,
    buildOverviewQuery,
    canFilterMissing,
    emptyOverviewFilters,
    hasCredentialFields,
    isOverviewFiltered,
    isOverviewForbidden,
    normalizeFilters,
    overviewErrorKey,
    pageCount,
    rowName,
} from './credentialOverview';

const fields = [{ key: 'mod_q_juleica' }, { key: 'mod_ks_praevention' }];

describe('buildOverviewQuery', () => {
    it('sends only the club and the page size by default', () => {
        expect(buildOverviewQuery('c1', emptyOverviewFilters(), 1)).toBe('clubId=c1&pageSize=25');
    });
    it('adds field, status, window, former members and page', () => {
        const q = new URLSearchParams(buildOverviewQuery('c1', { fieldKey: 'mod_q_juleica', status: 'expiring', withinDays: 30, includeFormer: true }, 3, 50));
        expect(Object.fromEntries(q)).toEqual({ clubId: 'c1', fieldKey: 'mod_q_juleica', status: 'expiring', withinDays: '30', includeFormer: 'true', page: '3', pageSize: '50' });
    });
    it('never sends status=missing without a field (the server answers 422)', () => {
        expect(buildOverviewQuery('c1', { ...emptyOverviewFilters(), status: 'missing' }, 1)).not.toContain('status');
        expect(buildOverviewQuery('c1', { ...emptyOverviewFilters(), status: 'missing', fieldKey: 'mod_q_juleica' }, 1)).toContain('status=missing');
    });
    it('encodes values', () => {
        expect(buildOverviewQuery('c 1', { ...emptyOverviewFilters(), fieldKey: 'a&b' }, 1)).toContain('clubId=c+1&fieldKey=a%26b');
    });
});

describe('filters', () => {
    it('allows "missing" only with a field', () => {
        expect(canFilterMissing({ fieldKey: '' })).toBe(false);
        expect(canFilterMissing({ fieldKey: 'x' })).toBe(true);
    });
    it('normalizes against the fields the server named', () => {
        expect(normalizeFilters({ fieldKey: 'weg', status: 'missing', withinDays: 7, includeFormer: true }, fields)).toEqual({ fieldKey: '', status: '', withinDays: 90, includeFormer: true });
        expect(normalizeFilters({ fieldKey: 'mod_q_juleica', status: 'missing', withinDays: 180, includeFormer: false }, fields)).toEqual({ fieldKey: 'mod_q_juleica', status: 'missing', withinDays: 180, includeFormer: false });
        expect(normalizeFilters({ fieldKey: '', status: 'expired', withinDays: 90, includeFormer: false }, fields).status).toBe('expired');
    });
    it('knows whether anything is set', () => {
        expect(isOverviewFiltered(emptyOverviewFilters())).toBe(false);
        expect(isOverviewFiltered({ ...emptyOverviewFilters(), withinDays: 30 })).toBe(true);
        expect(isOverviewFiltered({ ...emptyOverviewFilters(), includeFormer: true })).toBe(true);
    });
});

describe('rows and pages', () => {
    it('shows the display name, else first and last name', () => {
        expect(rowName({ displayName: ' Max M. ', firstName: 'Max', lastName: 'Muster' })).toBe('Max M.');
        expect(rowName({ displayName: '', firstName: 'Max', lastName: 'Muster' })).toBe('Max Muster');
        expect(rowName({ displayName: null, firstName: null, lastName: ' Muster ' })).toBe('Muster');
        expect(rowName({ displayName: null, firstName: null, lastName: null })).toBeNull();
    });
    it('counts pages, at least one', () => {
        expect(pageCount(0, 25)).toBe(1);
        expect(pageCount(25, 25)).toBe(1);
        expect(pageCount(26, 25)).toBe(2);
    });
});

describe('response and errors', () => {
    it('reads a well-formed answer and fills defaults', () => {
        const ok = asOverview({ data: [], page: 1, pageSize: 25, total: 0, fields: [] });
        expect(ok).toMatchObject({ total: 0, withinDays: 90, today: '' });
        expect(asOverview({ data: [] })).toBeNull();
        expect(asOverview(null)).toBeNull();
    });
    it('shows the entry only when there is a credential field', () => {
        expect(hasCredentialFields(null)).toBe(false);
        expect(hasCredentialFields({ fields: [] })).toBe(false);
        expect(hasCredentialFields({ fields: [{ id: '1', key: 'k', label: 'K', sensitive: false, options: null }] })).toBe(true);
    });
    it('treats 403 as "not for you" and maps the rest', () => {
        expect(isOverviewForbidden(new ApiError(403, 'FORBIDDEN', 'x'))).toBe(true);
        expect(isOverviewForbidden(new ApiError(404, 'NOT_FOUND', 'x'))).toBe(false);
        expect(isOverviewForbidden(new Error('x'))).toBe(false);
        expect(overviewErrorKey(new ApiError(404, 'NOT_FOUND', 'x'))).toBe('forms.cred.overview.err.fieldGone');
        expect(overviewErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'x'))).toBe('forms.cred.overview.err.invalid');
        expect(overviewErrorKey(new ApiError(429, 'TOO_MANY_REQUESTS', 'x'))).toBe('forms.cred.overview.err.rate');
        expect(overviewErrorKey(new Error('offline'))).toBe('verein.err.network');
    });
});
