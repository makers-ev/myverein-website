import { describe, expect, it } from 'vitest';

import { pendingRequests, requestFor, rideBody, rideProblem } from './rides';

describe('rides', () => {
    it('validates seats and place', () => {
        expect(rideProblem('3', 'Parkplatz')).toBeNull();
        expect(rideProblem('0', 'x')).toBe('seats');
        expect(rideProblem('9', 'x')).toBe('seats');
        expect(rideProblem('2.5', 'x')).toBe('seats');
        expect(rideProblem('2', '  ')).toBe('place');
    });

    it('builds the body with null for empty optional fields', () => {
        expect(rideBody('2', ' Halle ', '', ' ')).toEqual({ seats: 2, departurePlace: 'Halle', departureAt: null, note: null });
        expect((rideBody('2', 'H', '2026-05-01T10:00', 'x') as { departureAt: string }).departureAt).toBe(new Date('2026-05-01T10:00').toISOString());
    });

    it('finds the request of the person acted for', () => {
        const ride = { myRequests: [{ requestId: 'a', clubMemberId: 'me', status: 'angefragt' as const }, { requestId: 'b', clubMemberId: 'kid', status: 'zugesagt' as const }] };
        expect(requestFor(ride, 'kid', 'me')?.requestId).toBe('b');
        expect(requestFor(ride, null, 'me')?.requestId).toBe('a');
        expect(requestFor(ride, null, null)?.requestId).toBe('a');
        expect(requestFor({ myRequests: [] }, null, 'me')).toBeUndefined();
    });

    it('lists only open requests for the driver', () => {
        expect(pendingRequests({ requests: [{ requestId: '1', clubMemberId: 'a', displayName: null, status: 'angefragt', createdAt: '' }, { requestId: '2', clubMemberId: 'b', displayName: null, status: 'zugesagt', createdAt: '' }] })).toHaveLength(1);
        expect(pendingRequests({})).toEqual([]);
    });
});
