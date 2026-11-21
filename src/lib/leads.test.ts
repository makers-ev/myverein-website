import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { canConvert, createLeadBody, emptyFilters, emptyLeadForm, formFromLead, isOpen, leadErrorKey, leadPatch, leadProblem, leadsQuery, nextStatuses, pageCount, type Lead } from './leads';

const lead = (over: Partial<Lead> = {}): Lead => ({
    id: 'l1',
    name: 'Mia Muster',
    email: 'mia@example.org',
    phone: null,
    department: { id: 'd1', name: 'Fußball' },
    message: 'Hallo',
    source: 'oeffentliche_seite',
    status: 'neu',
    trialRequested: true,
    trialOn: null,
    waitlisted: false,
    waitlistedAt: null,
    notes: null,
    requestCount: 1,
    lastRequestAt: null,
    convertedClubMemberId: null,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...over,
});

describe('status transitions', () => {
    it('mirrors the backend rules and never offers "mitglied"', () => {
        expect(nextStatuses('neu')).toEqual(['kontaktiert', 'probetraining', 'abgelehnt']);
        expect(nextStatuses('abgelehnt')).toEqual(['neu']);
        expect(nextStatuses('mitglied')).toEqual([]);
        for (const s of ['neu', 'kontaktiert', 'probetraining', 'abgelehnt'] as const) expect(nextStatuses(s)).not.toContain('mitglied');
    });
    it('converts only leads that are not members yet', () => {
        expect(canConvert(lead())).toBe(true);
        expect(canConvert(lead({ status: 'mitglied' }))).toBe(false);
        expect(canConvert(lead({ convertedClubMemberId: 'm1' }))).toBe(false);
        expect(isOpen(lead({ status: 'abgelehnt' }))).toBe(false);
        expect(isOpen(lead({ status: 'probetraining' }))).toBe(true);
    });
});

describe('query and paging', () => {
    it('leaves empty filters out', () => {
        expect(leadsQuery('c1', emptyFilters())).toBe('clubId=c1&page=1&pageSize=25');
        expect(leadsQuery('c1', { ...emptyFilters(), status: 'neu', q: ' mia ', departmentId: 'd1', page: 2 })).toBe('clubId=c1&page=2&pageSize=25&status=neu&departmentId=d1&q=mia');
    });
    it('counts pages, at least one', () => {
        expect(pageCount(0)).toBe(1);
        expect(pageCount(25)).toBe(1);
        expect(pageCount(26)).toBe(2);
    });
});

describe('form', () => {
    it('needs a name and a plausible email if one is given', () => {
        expect(leadProblem(emptyLeadForm())).toBe('leads.err.name');
        expect(leadProblem({ ...emptyLeadForm(), name: 'A', email: 'kaputt' })).toBe('leads.err.email');
        expect(leadProblem({ ...emptyLeadForm(), name: 'A' })).toBeNull();
    });
    it('builds the manual entry without empty fields', () => {
        expect(createLeadBody({ ...emptyLeadForm(), name: ' Mia ', phone: '0123', departmentId: 'd1' })).toEqual({ name: 'Mia', phone: '0123', departmentId: 'd1' });
    });
    it('patches only what changed and clears with null', () => {
        const orig = formFromLead(lead());
        expect(leadPatch(orig, orig)).toEqual({});
        expect(leadPatch(orig, { ...orig, status: 'kontaktiert', notes: ' Rückruf ', trialOn: '2026-12-01', waitlisted: true, departmentId: '', email: '' })).toEqual({
            status: 'kontaktiert',
            notes: 'Rückruf',
            trialOn: '2026-12-01',
            waitlisted: true,
            departmentId: null,
            email: null,
        });
    });
});

describe('leadErrorKey', () => {
    it('maps the pipeline detail codes', () => {
        expect(leadErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'invalid_status_transition' }))).toBe('leads.err.transition');
        expect(leadErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'x', { code: 'use_convert' }))).toBe('leads.err.useConvert');
        expect(leadErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'lead_already_converted' }))).toBe('leads.err.alreadyConverted');
        expect(leadErrorKey(new ApiError(403, 'FORBIDDEN', 'no'))).toBe('verein.err.forbidden');
    });
});
