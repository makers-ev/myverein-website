import { describe, expect, it } from 'vitest';

import { type Candidate, type Shift, type Swap, canOfferSwap, planTotals, shiftBody, shiftLight, shiftProblem, sortCandidates, swapActions } from './helperPlan';

const shift = (over: Partial<Shift> = {}): Shift => ({ id: 's', startsAt: '', endsAt: '', capacity: 3, minStaff: 2, filled: 1, free: 2, full: false, understaffed: true, mine: false, mySignupId: null, signups: [], swaps: [], ...over });
const swap = (over: Partial<Swap>): Swap => ({ id: 'w', signupId: 'x', fromClubMemberId: 'f', fromName: null, toClubMemberId: null, toMe: false, mine: false, createdAt: '', ...over });

describe('helper plan', () => {
    it('derives the traffic light', () => {
        expect(shiftLight(shift())).toBe('red');
        expect(shiftLight(shift({ understaffed: false, full: true }))).toBe('green');
        expect(shiftLight(shift({ understaffed: false }))).toBe('yellow');
        // full wins over nothing: an understaffed shift (min above capacity cannot happen) stays red
        expect(shiftLight(shift({ understaffed: true, full: true }))).toBe('red');
    });

    it('totals shifts, understaffed shifts and open places', () => {
        expect(planTotals({ stations: [{ id: 'a', name: 'a', description: null, sortOrder: 0, shifts: [shift(), shift({ understaffed: false, free: 0, full: true })] }] })).toEqual({ shifts: 2, understaffed: 1, open: 2 });
    });

    it('checks the shift form', () => {
        expect(shiftProblem('2026-05-01T10:00', '2026-05-01T12:00', '3', '2')).toBeNull();
        expect(shiftProblem('2026-05-01T12:00', '2026-05-01T10:00', '3', '')).toBe('order');
        expect(shiftProblem('2026-05-01T10:00', '2026-05-20T10:00', '3', '')).toBe('range');
        expect(shiftProblem('2026-05-01T10:00', '2026-05-01T12:00', '0', '')).toBe('capacity');
        expect(shiftProblem('2026-05-01T10:00', '2026-05-01T12:00', '2', '3')).toBe('minStaff');
        expect(shiftBody('2026-05-01T10:00', '2026-05-01T12:00', '3', '').minStaff).toBe(0);
    });

    it('splits swap actions by viewer', () => {
        const mine = swap({ id: '1', mine: true });
        const toMe = swap({ id: '2', toMe: true, toClubMemberId: 'me' });
        const open = swap({ id: '3' });
        const toOther = swap({ id: '4', toClubMemberId: 'other' });
        const a = swapActions({ mine: false, swaps: [mine, toMe, open, toOther] });
        expect(a.respond.map((w) => w.id)).toEqual(['2']);
        expect(a.takeOver.map((w) => w.id)).toEqual(['3']);
        expect(a.withdraw.map((w) => w.id)).toEqual(['1']);
        // somebody already on the shift cannot take a give-away of the same shift
        expect(swapActions({ mine: true, swaps: [open] }).takeOver).toEqual([]);
    });

    it('offers a swap only for own sign-ups without an open request', () => {
        expect(canOfferSwap({ mine: true, swaps: [] })).toBe(true);
        expect(canOfferSwap({ mine: true, swaps: [swap({ mine: true })] })).toBe(false);
        expect(canOfferSwap({ mine: false, swaps: [] })).toBe(false);
    });

    it('sorts candidates by availability then name', () => {
        const c = (name: string, availability: Candidate['availability']): Candidate => ({ clubMemberId: name, displayName: name, availability, hasAccount: true, isMinor: false, alreadyOnShift: false, conflicting: false });
        expect(sortCandidates([c('Zoe', 'verfuegbar'), c('Al', 'nicht_verfuegbar'), c('Bo', 'unbekannt'), c('Ann', 'verfuegbar')]).map((x) => x.displayName)).toEqual(['Ann', 'Zoe', 'Bo', 'Al']);
    });
});
