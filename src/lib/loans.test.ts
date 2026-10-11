import { describe, expect, it } from 'vitest';

import { canBorrow, canReturn } from './loans';

describe('canBorrow', () => {
    it('follows the club switch for plain members', () => {
        expect(canBorrow(true, false)).toBe(true);
        expect(canBorrow(false, false)).toBe(false);
    });
    it('hides the action while the setting is unknown', () => {
        expect(canBorrow(null, false)).toBe(false);
    });
    it('exempts inventory managers', () => {
        expect(canBorrow(false, true)).toBe(true);
        expect(canBorrow(null, true)).toBe(true);
    });
});

describe('canReturn', () => {
    const open = { memberId: 'm1', returnedAt: null };
    it('allows the borrower and managers on open loans', () => {
        expect(canReturn(open, 'm1', false)).toBe(true);
        expect(canReturn(open, 'm2', false)).toBe(false);
        expect(canReturn(open, 'm2', true)).toBe(true);
        expect(canReturn(open, null, false)).toBe(false);
    });
    it('never offers a returned loan', () => {
        expect(canReturn({ memberId: 'm1', returnedAt: '2026-01-01T00:00:00Z' }, 'm1', true)).toBe(false);
    });
});
