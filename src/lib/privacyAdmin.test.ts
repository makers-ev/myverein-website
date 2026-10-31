import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { memberErrorKey } from './clubMembers';
import { accountDeletionErrorKey, daysLabel, deadlineTone, dpaBannerKind, type DpaCurrent, isDpaRequired, normalizeVisibility, privacyErrorKey, retentionProblem } from './privacyAdmin';

describe('deadlineTone', () => {
    it('is a traffic light for open requests', () => {
        expect(deadlineTone({ status: 'open', daysLeft: 25, overdue: false })).toBe('success');
        expect(deadlineTone({ status: 'in_progress', daysLeft: 14, overdue: false })).toBe('warning');
        expect(deadlineTone({ status: 'open', daysLeft: 3, overdue: false })).toBe('destructive');
        expect(deadlineTone({ status: 'open', daysLeft: -2, overdue: true })).toBe('destructive');
    });
    it('has no light for closed requests', () => {
        expect(deadlineTone({ status: 'done', daysLeft: -9, overdue: true })).toBe('muted');
        expect(deadlineTone({ status: 'rejected', daysLeft: null, overdue: false })).toBe('muted');
    });
});

describe('account deletion errors', () => {
    it('maps ERASURE_<BLOCKER> codes to blocker texts', () => {
        expect(accountDeletionErrorKey('ERASURE_OPEN_LOANS')).toBe('privacy.erasure.blocker.open_loans');
        expect(accountDeletionErrorKey('ERASURE_SOLE_OWNER')).toBe('privacy.erasure.blocker.sole_owner');
        expect(accountDeletionErrorKey('ERASURE_SOMETHING_NEW')).toBe('privacy.erasure.blocker.unknown');
    });
    it('ignores other codes', () => {
        expect(accountDeletionErrorKey('INVALID_PASSWORD')).toBeNull();
        expect(accountDeletionErrorKey(undefined)).toBeNull();
    });
});

describe('DPA_REQUIRED', () => {
    const err = new ApiError(403, 'DPA_REQUIRED', 'raw english text', { code: 'dpa_required', version: 2 });
    it('is recognised and shown in plain words everywhere', () => {
        expect(isDpaRequired(err)).toBe(true);
        expect(memberErrorKey(err)).toBe('privacy.err.dpaRequired');
        expect(privacyErrorKey(err)).toBe('privacy.err.dpaRequired');
    });
    it('is not confused with other 403s', () => {
        expect(isDpaRequired(new ApiError(403, 'FORBIDDEN', 'x'))).toBe(false);
        expect(memberErrorKey(new ApiError(403, 'FORBIDDEN', 'x'))).toBe('verein.err.forbidden');
    });
});

describe('privacyErrorKey', () => {
    it('maps erasure blockers and plan changes', () => {
        expect(privacyErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'legal_hold' }))).toBe('privacy.erasure.blocker.legal_hold');
        expect(privacyErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'plan_outdated' }))).toBe('privacy.err.planOutdated');
    });
    it('falls back to the consent and generic mapping', () => {
        expect(privacyErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'proof_required' }))).toBe('privacy.err.proofRequired');
        expect(privacyErrorKey(new ApiError(404, 'NOT_FOUND', 'x'))).toBe('verein.err.notFound');
    });
});

describe('dpaBannerKind', () => {
    const base: DpaCurrent = {
        version: { id: 'v', version: 1, title: 'AV', body: 'b', subprocessors: [], tomAnnex: null, sha256: 's', requiredFrom: null, publishedAt: '2026-01-01' },
        status: { required: true, version: 1, accepted: false, acceptedAt: null, signerName: null, mandatoryFrom: null, deadline: '2026-02-01', daysLeft: 10, blocked: false },
        canAccept: true,
    };
    it('distinguishes blocked, grace and open', () => {
        expect(dpaBannerKind(base)).toBe('grace');
        expect(dpaBannerKind({ ...base, status: { ...base.status, blocked: true } })).toBe('blocked');
        expect(dpaBannerKind({ ...base, status: { ...base.status, required: false, daysLeft: null } })).toBe('open');
    });
    it('shows nothing without a version or after acceptance', () => {
        expect(dpaBannerKind(null)).toBeNull();
        expect(dpaBannerKind({ ...base, version: null })).toBeNull();
        expect(dpaBannerKind({ ...base, status: { ...base.status, accepted: true } })).toBeNull();
    });
});

describe('retention helpers', () => {
    const rule = { minDays: 365, maxDays: 1095 };
    it('checks the bounds of an override', () => {
        expect(retentionProblem(rule, '730')).toBeNull();
        expect(retentionProblem(rule, '100')).toBe('privacy.retention.err.bounds');
        expect(retentionProblem(rule, '2000')).toBe('privacy.retention.err.bounds');
        expect(retentionProblem(rule, 'abc')).toBe('privacy.retention.err.number');
        expect(retentionProblem(rule, '7.5')).toBe('privacy.retention.err.number');
    });
    it('shows whole years as years', () => {
        expect(daysLabel(730)).toEqual({ unit: 'years', count: 2 });
        expect(daysLabel(90)).toEqual({ unit: 'days', count: 90 });
        expect(daysLabel(400)).toEqual({ unit: 'days', count: 400 });
    });
});

describe('normalizeVisibility', () => {
    it('defaults to the board only and ignores unknown levels', () => {
        expect(normalizeVisibility(null)).toEqual({ phone: 'nur_vorstand', email: 'nur_vorstand', address: 'nur_vorstand', photo: 'nur_vorstand' });
        expect(normalizeVisibility({ phone: 'mitglieder', email: 'everyone', photo: 'trainer' })).toEqual({ phone: 'mitglieder', email: 'nur_vorstand', address: 'nur_vorstand', photo: 'trainer' });
    });
});
