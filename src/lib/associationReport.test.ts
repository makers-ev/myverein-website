import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { ageGroupLabels, defaultOptions, genderFieldCandidates, optionsProblem, parseAgeBands, reportErrorKey, reportFilename, reportQuery, toggleColumn } from './associationReport';

describe('parseAgeBands', () => {
    it('accepts strictly ascending whole numbers', () => {
        expect(parseAgeBands('6,14,18')).toEqual([6, 14, 18]);
        expect(parseAgeBands(' 6 , 14 ')).toEqual([6, 14]);
        expect(parseAgeBands('18')).toEqual([18]);
    });
    it('rejects everything else', () => {
        for (const bad of ['', '6,,14', '14,6', '6,6', '0,5', '6,121', 'a,b', '6.5', '-3', '1,2,3,4,5,6,7,8,9,10,11,12,13']) expect(parseAgeBands(bad), bad).toBeNull();
    });
    it('labels the groups like the backend', () => {
        expect(ageGroupLabels([6, 14, 18, 26, 40, 60])).toEqual(['0-6', '7-14', '15-18', '19-26', '27-40', '41-60', '61+']);
    });
});

describe('options', () => {
    it('starts with department and age group on today', () => {
        const o = defaultOptions();
        expect(o.columns).toEqual(['department', 'ageGroup']);
        expect(o.stichtag).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(optionsProblem(o)).toBeNull();
    });
    it('keeps the canonical column order when toggling', () => {
        expect(toggleColumn(['department', 'ageGroup'], 'category')).toEqual(['department', 'ageGroup', 'category']);
        expect(toggleColumn(['ageGroup', 'category'], 'department')).toEqual(['department', 'ageGroup', 'category']);
        expect(toggleColumn(['department'], 'department')).toEqual([]);
    });
    it('names the first problem', () => {
        const o = defaultOptions();
        expect(optionsProblem({ ...o, stichtag: '' })).toBe('assoc.err.stichtag');
        expect(optionsProblem({ ...o, columns: [] })).toBe('assoc.err.columns');
        expect(optionsProblem({ ...o, ageBands: '9,3' })).toBe('assoc.err.ageBands');
        expect(optionsProblem({ ...o, columns: ['department'], ageBands: '9,3' })).toBeNull();
        expect(optionsProblem({ ...o, columns: ['gender'] })).toBe('assoc.err.genderField');
        expect(optionsProblem({ ...o, columns: ['gender'], genderField: 'geschlecht' })).toBeNull();
    });
});

describe('reportQuery', () => {
    const base = { ...defaultOptions(), stichtag: '2026-01-01' };
    it('leaves defaults out', () => {
        expect(reportQuery('c1', base, 'json')).toBe('clubId=c1&stichtag=2026-01-01&columns=department%2CageGroup&format=json');
        expect(reportQuery('c1', base, 'csv')).toBe('clubId=c1&stichtag=2026-01-01&columns=department%2CageGroup&format=csv');
    });
    it('sends age options only when the age group is a column', () => {
        const custom = { ...base, ageBands: '10, 20', ageMode: 'stichtag' as const, delimiter: ',' as const };
        expect(reportQuery('c1', custom, 'csv')).toBe('clubId=c1&stichtag=2026-01-01&columns=department%2CageGroup&ageBands=10%2C20&ageMode=stichtag&format=csv&delimiter=%2C');
        expect(reportQuery('c1', { ...custom, columns: ['department'] }, 'json')).toBe('clubId=c1&stichtag=2026-01-01&columns=department&format=json');
    });
    it('sends the gender field with the gender column', () => {
        expect(reportQuery('c1', { ...base, columns: ['gender', 'category'], genderField: 'geschlecht' }, 'json')).toContain('genderField=geschlecht');
        expect(reportQuery('c1', { ...base, genderField: 'geschlecht' }, 'json')).not.toContain('genderField');
    });
});

describe('gender field and errors', () => {
    it('offers live select/text fields, protected ones only with the sensitive right', () => {
        const defs = [
            { key: 'a', type: 'select', archived: false, sensitive: false },
            { key: 'b', type: 'text', archived: false, sensitive: true },
            { key: 'c', type: 'date', archived: false, sensitive: false },
            { key: 'd', type: 'select', archived: true, sensitive: false },
        ];
        expect(genderFieldCandidates(defs, false).map((d) => d.key)).toEqual(['a']);
        expect(genderFieldCandidates(defs, true).map((d) => d.key)).toEqual(['a', 'b']);
    });
    it('maps the backend codes and names the file', () => {
        expect(reportErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'x', { code: 'gender_field_required' }))).toBe('assoc.err.genderField');
        expect(reportErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'x', { code: 'unknown_gender_field' }))).toBe('assoc.err.genderUnknown');
        expect(reportErrorKey(new ApiError(403, 'FORBIDDEN', 'no'))).toBe('verein.err.forbidden');
        expect(reportFilename('2026-01-01')).toBe('verbandsmeldung-2026-01-01.csv');
    });
});
