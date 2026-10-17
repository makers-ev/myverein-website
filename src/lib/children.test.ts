import { describe, expect, it } from 'vitest';

import { asChildren, childName } from './children';

describe('asChildren', () => {
    it('reads the children and keeps only usable entries', () => {
        const res = { data: [{ clubMemberId: 'c1', displayName: 'Mia M.', firstName: 'Mia', lastName: 'Muster', status: 'aktiv' }, { clubMemberId: '' }, null, { displayName: 'ohne Id' }, { clubMemberId: 'c2', displayName: null, firstName: 'Ben', lastName: null }] };
        expect(asChildren(res)).toEqual([
            { clubMemberId: 'c1', displayName: 'Mia M.', firstName: 'Mia', lastName: 'Muster', status: 'aktiv' },
            { clubMemberId: 'c2', displayName: null, firstName: 'Ben', lastName: null, status: '' },
        ]);
    });
    it('is an empty list for anything unexpected (no difference between "no child" and "failed")', () => {
        for (const bad of [null, undefined, {}, { data: null }, { data: 'x' }, []]) expect(asChildren(bad)).toEqual([]);
        expect(asChildren({ data: [] })).toEqual([]);
    });
});

describe('childName', () => {
    it('prefers the display name, else first and last name, else null', () => {
        expect(childName({ displayName: 'Mia M.', firstName: 'Mia', lastName: 'Muster' })).toBe('Mia M.');
        expect(childName({ displayName: null, firstName: 'Mia', lastName: 'Muster' })).toBe('Mia Muster');
        expect(childName({ displayName: null, firstName: null, lastName: 'Muster' })).toBe('Muster');
        expect(childName({ displayName: null, firstName: null, lastName: null })).toBeNull();
    });
});
