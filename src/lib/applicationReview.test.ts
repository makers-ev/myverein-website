import { describe, expect, it, vi } from 'vitest';

vi.mock('./api-client', () => {
    class ApiError extends Error {
        constructor(
            readonly status: number,
            readonly code: string,
            message: string,
            readonly details?: unknown,
        ) {
            super(message);
        }
    }
    return { ApiError };
});

import { ApiError } from './api-client';
import {
    answerText,
    approveBody,
    clampPage,
    duplicateKindKey,
    isStaleDecision,
    listQuery,
    type MappingEntry,
    mappingReasonKey,
    mappingTargetText,
    rejectBody,
    reviewErrorKey,
    reviewWarningKey,
    safeDownloadName,
    shortHash,
} from './applicationReview';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

describe('request helpers', () => {
    it('builds the paged list query', () => {
        expect(listQuery('c1', 2)).toBe('clubId=c1&page=2&pageSize=20');
        expect(listQuery('c 1', 0, 5)).toBe('clubId=c%201&page=1&pageSize=5');
    });
    it('clamps the page after decisions emptied the last one', () => {
        expect(clampPage(3, 41)).toBe(3);
        expect(clampPage(3, 40)).toBe(2);
        expect(clampPage(2, 0)).toBe(1);
        expect(clampPage(0, 10)).toBe(1);
    });
    it('sends a category only when the board chose one', () => {
        expect(approveBody('')).toBeUndefined();
        expect(approveBody('cat-1')).toEqual({ categoryId: 'cat-1' });
    });
    it('keeps the internal note and the applicant message apart and drops empty ones', () => {
        expect(rejectBody('  intern  ', ' Bitte melde dich ')).toEqual({ note: 'intern', applicantMessage: 'Bitte melde dich' });
        expect(rejectBody('', '  ')).toEqual({});
        expect(rejectBody('nur intern', '')).toEqual({ note: 'nur intern' });
    });
});

describe('display helpers', () => {
    it('formats answers', () => {
        expect(answerText({ answered: false, display: null }, t)).toBe('—');
        expect(answerText({ answered: true, display: true }, t)).toBe('forms.review.yes');
        expect(answerText({ answered: true, display: false }, t)).toBe('forms.review.no');
        expect(answerText({ answered: true, display: ['A', 'B'] }, t)).toBe('A, B');
        expect(answerText({ answered: true, display: 42 }, t)).toBe('42');
        // a redacted answer has no display
        expect(answerText({ answered: true, display: null }, t)).toBe('—');
    });

    it('translates mapping targets and frames custom fields', () => {
        const base: MappingEntry = { fieldKey: 'k', fieldLabel: 'L', kind: 'master', target: 'firstName', customFieldKey: null, targetLabel: 'Vorname', willApply: true };
        expect(mappingTargetText(base, t)).toBe('forms.review.target.firstName');
        const custom: MappingEntry = { ...base, kind: 'custom', target: null, customFieldKey: 'jersey', targetLabel: 'Zusatzfeld „Trikotgröße“' };
        expect(mappingTargetText(custom, t)).toBe('forms.review.target.custom:{"name":"Trikotgröße"}');
        expect(mappingTargetText({ ...custom, targetLabel: null }, t)).toBe('forms.review.target.custom:{"name":"jersey"}');
        expect(mappingTargetText({ ...base, kind: 'none', target: null }, t)).toBeNull();
        // an unknown allowlist target from a newer backend is not shown as a raw key
        expect(mappingTargetText({ ...base, target: 'shoeSize' }, t)).toBeNull();
    });

    it('maps skip reasons, duplicates, warnings and hashes', () => {
        expect(mappingReasonKey('not_answered')).toBe('forms.review.mapping.reason.not_answered');
        expect(mappingReasonKey('custom_field_archived')).toBe('forms.review.mapping.reason.custom_field_archived');
        expect(mappingReasonKey('brand_new')).toBe('forms.review.mapping.reason.other');
        expect(mappingReasonKey(undefined)).toBe('forms.review.mapping.reason.other');
        expect(duplicateKindKey(['name_birth_date'])).toBe('forms.review.duplicate.name');
        expect(duplicateKindKey(['email'])).toBe('forms.review.duplicate.email');
        expect(duplicateKindKey(['name_birth_date', 'email'])).toBe('forms.review.duplicate.both');
        expect(reviewWarningKey('child_is_adult')).toBe('forms.review.warn.child_is_adult');
        expect(reviewWarningKey('x')).toBeNull();
        expect(shortHash('0123456789abcdef0123')).toBe('0123456789ab');
    });

    it('sanitises download names', () => {
        expect(safeDownloadName('../../etc/passwd')).toBe('_.._etc_passwd');
        expect(safeDownloadName('a:b*c.pdf')).toBe('a_b_c.pdf');
        expect(safeDownloadName(null)).toBe('datei');
        expect(safeDownloadName('   ')).toBe('datei');
        // bidi override cannot disguise the extension, extension follows the stored type
        expect(safeDownloadName('foto\u202Egpj.exe', 'application/pdf')).toBe('foto_gpj.pdf');
        expect(safeDownloadName('report.pdf. ', 'application/pdf')).toBe('report.pdf');
        expect(safeDownloadName('con.txt')).toBe('_con.txt');
        expect(safeDownloadName('NUL', 'image/png')).toBe('_NUL.png');
        expect(Array.from(safeDownloadName('x'.repeat(500) + '.pdf', 'application/pdf')).length).toBeLessThanOrEqual(84);
    });
});

describe('decision errors', () => {
    it('recognises a stale list', () => {
        expect(isStaleDecision(new ApiError(404, 'NOT_FOUND', 'm'))).toBe(true);
        expect(isStaleDecision(new ApiError(409, 'CONFLICT', 'Application has already been decided'))).toBe(true);
        expect(isStaleDecision(new ApiError(409, 'CONFLICT', 'm', { code: 'application_withdrawn' }))).toBe(true);
        expect(isStaleDecision(new ApiError(409, 'CONFLICT', 'm', { code: 'decision_busy' }))).toBe(false);
        expect(isStaleDecision(new ApiError(409, 'CONFLICT', 'Applicant is already a member of this club'))).toBe(false);
        expect(isStaleDecision(new ApiError(500, 'X', 'm'))).toBe(false);
        expect(isStaleDecision(new Error('x'))).toBe(false);
    });
    it('maps decision errors to plain texts', () => {
        expect(reviewErrorKey(new ApiError(409, 'CONFLICT', 'Application has already been decided'))).toBe('forms.review.err.decided');
        expect(reviewErrorKey(new ApiError(409, 'CONFLICT', 'm', { code: 'application_withdrawn' }))).toBe('forms.err.applicationWithdrawn');
        expect(reviewErrorKey(new ApiError(409, 'CONFLICT', 'm', { code: 'decision_busy' }))).toBe('forms.err.decisionBusy');
        expect(reviewErrorKey(new ApiError(409, 'CONFLICT', 'Applicant is already a member of this club'))).toBe('forms.review.err.alreadyMember');
        expect(reviewErrorKey(new ApiError(404, 'NOT_FOUND', 'Application not found'))).toBe('forms.review.err.gone');
        expect(reviewErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'Unknown or archived category'))).toBe('forms.review.err.category');
        expect(reviewErrorKey(new ApiError(403, 'FORBIDDEN', 'm'))).toBe('verein.err.forbidden');
        expect(reviewErrorKey(new ApiError(409, 'CONFLICT', 'm', { code: 'member_rejoin_blocked' }))).toBe('verein.err.rejoinBlocked');
        expect(reviewErrorKey(new TypeError('network'))).toBe('verein.err.network');
    });
});
