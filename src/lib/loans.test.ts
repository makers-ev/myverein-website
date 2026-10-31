import { describe, expect, it } from 'vitest';

import { buildExtension, canBorrow, canExtend, canReturn, isGuestRole } from './loans';

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

describe('canBorrow guards', () => {
    it('never for guests or items with an open loan', () => {
        expect(canBorrow(true, false, true)).toBe(false);
        expect(canBorrow(true, true, true)).toBe(false);
        expect(canBorrow(true, false, false, true)).toBe(false);
        expect(canBorrow(false, true, false, true)).toBe(false);
    });
    it('detects the guest role', () => {
        expect(isGuestRole('guest')).toBe(true);
        expect(isGuestRole('member, guest')).toBe(true);
        expect(isGuestRole('member')).toBe(false);
        expect(isGuestRole(null)).toBe(false);
    });
});

describe('extension', () => {
    const now = new Date('2030-06-01T10:00:00');
    it('is offered to managers for open loans with a due date only', () => {
        expect(canExtend({ dueAt: '2030-06-10T00:00:00Z', returnedAt: null }, true)).toBe(true);
        expect(canExtend({ dueAt: '2030-06-10T00:00:00Z', returnedAt: null }, false)).toBe(false);
        expect(canExtend({ dueAt: null, returnedAt: null }, true)).toBe(false);
        expect(canExtend({ dueAt: '2030-06-10T00:00:00Z', returnedAt: '2030-06-02T00:00:00Z' }, true)).toBe(false);
    });
    it('validates the new date', () => {
        expect(buildExtension('', '2030-06-10T00:00:00Z', now)).toEqual({ problem: 'required' });
        expect(buildExtension('2030-05-30', null, now)).toEqual({ problem: 'past' });
        expect(buildExtension('2030-06-05', '2030-06-10T12:00:00Z', now)).toEqual({ problem: 'notLater' });
        const ok = buildExtension('2030-06-20', '2030-06-10T12:00:00Z', now);
        expect('dueAt' in ok && ok.dueAt.endsWith('Z')).toBe(true);
    });
});
