import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { absenceBody, absenceErrorKey, absenceProblem, periodLabel } from './absences';

describe('absenceProblem', () => {
    const ok = { startsOn: '2026-10-21', endsOn: '2026-10-22', note: '' };
    it('accepts a valid period', () => expect(absenceProblem(ok)).toBeNull());
    it('rejects missing dates', () => expect(absenceProblem({ ...ok, startsOn: '' })).toBe('dates'));
    it('rejects an end before the start', () => expect(absenceProblem({ ...ok, endsOn: '2026-10-20' })).toBe('order'));
    it('rejects a note over 200 characters', () => expect(absenceProblem({ ...ok, note: 'x'.repeat(201) })).toBe('note'));
});

describe('absenceBody', () => {
    it('leaves out an empty note and trims', () => {
        expect(absenceBody({ kind: 'krank', startsOn: 'a', endsOn: 'b', note: '  ' })).toEqual({ kind: 'krank', startsOn: 'a', endsOn: 'b' });
        expect(absenceBody({ kind: 'abwesend', startsOn: 'a', endsOn: 'b', note: ' Urlaub ' }).note).toBe('Urlaub');
    });
});

describe('absenceErrorKey', () => {
    it('maps the detail codes', () => {
        expect(absenceErrorKey(new ApiError(422, 'VALIDATION_ERROR', 'x', { code: 'period_too_long' }))).toBe('absence.err.periodTooLong');
        expect(absenceErrorKey(new ApiError(403, 'FORBIDDEN', 'x', { code: 'guardian_cannot_report_absence' }))).toBe('absence.err.guardianCannot');
    });
    it('falls back to the generic mapping', () => expect(absenceErrorKey(new ApiError(403, 'FORBIDDEN', 'x'))).toBe('verein.err.forbidden'));
});

describe('periodLabel', () => {
    const f = (d: string) => d;
    it('collapses a single day', () => expect(periodLabel('a', 'a', f)).toBe('a'));
    it('joins a range', () => expect(periodLabel('a', 'b', f)).toBe('a – b'));
});
