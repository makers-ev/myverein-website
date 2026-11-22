import { describe, expect, it } from 'vitest';

import { MAX_FIELD_LENGTH, initials, missingCityChars, missingNameChars, parseQuery, quietState, queryToSearch, sameQuery } from './clubSearch';

const params = (s: string) => new URLSearchParams(s);

describe('parseQuery', () => {
    it('reads q and ort', () => {
        expect(parseQuery(params('q=TSV&ort=Hamburg'))).toEqual({ q: 'TSV', city: 'Hamburg' });
    });
    it('defaults to empty and ignores unknown parameters', () => {
        expect(parseQuery(params('x=1'))).toEqual({ q: '', city: '' });
    });
    it('trims, collapses whitespace and strips control characters', () => {
        expect(parseQuery(params('q=%20%20Turn%0A%20%20verein%00&ort=%09Köln%20'))).toEqual({ q: 'Turn verein', city: 'Köln' });
    });
    it('caps over-long values', () => {
        expect(parseQuery(params(`q=${'a'.repeat(500)}`)).q).toHaveLength(MAX_FIELD_LENGTH);
    });
});

describe('queryToSearch', () => {
    it('is empty without input', () => {
        expect(queryToSearch({ q: '  ', city: '' })).toBe('');
    });
    it('writes only the filled fields', () => {
        expect(queryToSearch({ q: 'Sport', city: '' })).toBe('?q=Sport');
        expect(queryToSearch({ q: '', city: 'Ulm' })).toBe('?ort=Ulm');
    });
    it('encodes and round-trips', () => {
        const query = { q: 'FC Müller & Söhne', city: 'Bad Homburg' };
        expect(parseQuery(new URLSearchParams(queryToSearch(query).slice(1)))).toEqual(query);
    });
});

describe('sameQuery', () => {
    it('ignores surrounding whitespace only', () => {
        expect(sameQuery({ q: 'abc ', city: '' }, { q: 'abc', city: '' })).toBe(true);
        expect(sameQuery({ q: 'abc', city: '' }, { q: 'abd', city: '' })).toBe(false);
    });
});

describe('missing characters', () => {
    it('is 0 for empty and long enough', () => {
        expect(missingNameChars('')).toBe(0);
        expect(missingNameChars('abc')).toBe(0);
        expect(missingCityChars('ab')).toBe(0);
    });
    it('counts what is missing (whitespace does not count)', () => {
        expect(missingNameChars('a ')).toBe(2);
        expect(missingCityChars('u')).toBe(1);
    });
});

describe('quietState', () => {
    it('distinguishes nothing, too short and searchable', () => {
        expect(quietState({ q: '', city: '' }).kind).toBe('idle');
        expect(quietState({ q: 'ab', city: 'u' }).kind).toBe('tooShort');
        expect(quietState({ q: 'abc', city: '' }).kind).toBe('loading');
        expect(quietState({ q: '', city: 'ul' }).kind).toBe('loading');
    });
});

describe('initials', () => {
    it('uses the first letters of up to two words', () => {
        expect(initials('TSV Beispiel')).toBe('TB');
        expect(initials('Turnverein')).toBe('T');
        expect(initials('  - 1. FC Köln')).toBe('1F');
        expect(initials('---')).toBe('?');
    });
});
