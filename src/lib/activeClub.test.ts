import { describe, expect, it } from 'vitest';

import { chooseClub } from '@/lib/activeClub';

const clubs = [{ clubId: 'a' }, { clubId: 'b' }];

describe('chooseClub', () => {
    it('prefers the remembered club', () => {
        expect(chooseClub(clubs, 'b')?.clubId).toBe('b');
    });
    it('falls back to the first club when the remembered one is gone or unset', () => {
        expect(chooseClub(clubs, 'zzz')?.clubId).toBe('a');
        expect(chooseClub(clubs, null)?.clubId).toBe('a');
    });
    it('is undefined without clubs', () => {
        expect(chooseClub([], 'a')).toBeUndefined();
        expect(chooseClub(null, 'a')).toBeUndefined();
    });
});
