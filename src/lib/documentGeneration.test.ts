import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { isActiveJob, jobErrorKey, memberListParams, offers, orderedColumns, pollDelayMs, reportYears, resultDownloadPath, generationErrorKey } from './documentGeneration';

describe('documentGeneration', () => {
    it('knows which jobs are still running', () => {
        expect(isActiveJob({ status: 'wartet' })).toBe(true);
        expect(isActiveJob({ status: 'rendert' })).toBe(true);
        expect(isActiveJob({ status: 'fertig' })).toBe(false);
        expect(isActiveJob({ status: 'fehlgeschlagen' })).toBe(false);
    });

    it('slows polling down for long jobs', () => {
        expect(pollDelayMs(0)).toBeLessThan(pollDelayMs(10));
        expect(pollDelayMs(10)).toBeLessThan(pollDelayMs(30));
    });

    it('maps job error codes and falls back to a generic text', () => {
        expect(jobErrorKey('render_timeout')).toBe('docs.gen.job.err.render_timeout');
        expect(jobErrorKey('internal_error')).toBe('docs.gen.job.err.render_failed');
        expect(jobErrorKey(null)).toBe('docs.gen.job.err.render_failed');
    });

    it('maps refused requests by details.code, then status', () => {
        expect(generationErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'minutes_not_approved' }))).toBe('docs.gen.err.minutesNotApproved');
        expect(generationErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'not_a_member_on_date' }))).toBe('docs.gen.err.notMember');
        expect(generationErrorKey(new ApiError(403, 'FORBIDDEN', 'x'))).toBe('docs.gen.err.forbidden');
        expect(generationErrorKey(new ApiError(422, 'QUOTA_EXCEEDED', 'x', { code: 'club_quota' }))).toBe('docs.err.quota');
    });

    it('builds download paths for archive and personal results', () => {
        expect(resultDownloadPath({ kind: 'archive' }, 'd1', 'clubId=c')).toBe('/documents/d1/download?clubId=c');
        expect(resultDownloadPath({ kind: 'person', memberId: 'm1' }, 'd1', 'clubId=c')).toBe('/member-documents/m1/d1/download?clubId=c');
    });

    it('keeps the fixed column order and drops unknown columns', () => {
        expect(orderedColumns(new Set(['email', 'name', 'bogus', 'memberNumber']))).toEqual(['memberNumber', 'name', 'email']);
    });

    it('leaves default parameters out of the member list request', () => {
        expect(memberListParams({ columns: ['name'], asOf: '', includeLeft: false, departmentId: '' })).toEqual({ columns: ['name'] });
        expect(memberListParams({ columns: ['name'], asOf: '2026-01-01', includeLeft: true, departmentId: 'd' })).toEqual({ columns: ['name'], asOf: '2026-01-01', includeLeft: true, departmentId: 'd' });
    });

    it('offers only job-backed templates', () => {
        const base = { version: 1, label: '', description: '', sync: true, docType: '' };
        const list = [
            { ...base, id: 'jahresbericht', destination: 'archive' as const },
            { ...base, id: 'branding-test', destination: 'ephemeral' as const },
        ];
        expect(offers(list, 'jahresbericht')).toBe(true);
        expect(offers(list, 'branding-test')).toBe(false);
        expect(offers(null, 'jahresbericht')).toBe(false);
    });

    it('lists the current and the previous years', () => {
        expect(reportYears(2026, 3)).toEqual([2026, 2025, 2024]);
    });
});
