import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { type AvailabilityHints, hintFailure, hintRequest, sortedNames } from './availabilityHints';

const base = { clubId: 'c1', calendarId: 'cal', startsAt: '2026-12-01T17:00:00.000Z', endsAt: '2026-12-01T19:00:00.000Z' };

describe('hintRequest', () => {
    it('builds the query with optional end and event', () => {
        const r = hintRequest({ ...base, eventId: 'e1' });
        expect(r.kind).toBe('query');
        if (r.kind === 'query') {
            const qs = new URLSearchParams(r.query);
            expect(qs.get('calendarId')).toBe('cal');
            expect(qs.get('startsAt')).toBe(base.startsAt);
            expect(qs.get('endsAt')).toBe(base.endsAt);
            expect(qs.get('eventId')).toBe('e1');
        }
        const open = hintRequest({ ...base, endsAt: null });
        expect(open.kind === 'query' && new URLSearchParams(open.query).has('endsAt')).toBe(false);
    });

    it('skips incomplete or impossible input and ranges beyond 14 days', () => {
        expect(hintRequest({ ...base, calendarId: '' })).toEqual({ kind: 'skip', reason: 'incomplete' });
        expect(hintRequest({ ...base, startsAt: 'x' })).toEqual({ kind: 'skip', reason: 'incomplete' });
        expect(hintRequest({ ...base, endsAt: base.startsAt })).toEqual({ kind: 'skip', reason: 'incomplete' });
        expect(hintRequest({ ...base, endsAt: '2026-12-20T19:00:00.000Z' })).toEqual({ kind: 'skip', reason: 'range' });
    });
});

describe('hintFailure', () => {
    it('tells missing rights, rate limit, range and other errors apart', () => {
        expect(hintFailure(new ApiError(403, 'FORBIDDEN', 'x'))).toBe('forbidden');
        expect(hintFailure(new ApiError(429, 'RATE', 'x'))).toBe('rate');
        expect(hintFailure(new ApiError(422, 'X', 'x', { code: 'range_too_long' }))).toBe('range');
        expect(hintFailure(new ApiError(500, 'X', 'x'))).toBe('error');
        expect(hintFailure(new Error('network'))).toBe('error');
    });
});

describe('sortedNames', () => {
    const h = (people: AvailabilityHints['unavailablePeople']) => ({ includesNames: true, unavailablePeople: people }) as AvailabilityHints;
    it('sorts names and tolerates counters-only answers', () => {
        expect(sortedNames(h([{ clubMemberId: '2', displayName: 'Zoe' }, { clubMemberId: '1', displayName: 'Anna' }]))).toEqual(['Anna', 'Zoe']);
        expect(sortedNames(h(null))).toEqual([]);
    });

    it('returns names only for includesNames === true', () => {
        const people = [{ clubMemberId: '1', displayName: 'Anna' }];
        expect(sortedNames({ includesNames: false, unavailablePeople: people } as AvailabilityHints)).toEqual([]);
        expect(sortedNames({ unavailablePeople: people } as AvailabilityHints)).toEqual([]);
        expect(sortedNames({ includesNames: true, unavailablePeople: people } as AvailabilityHints)).toEqual(['Anna']);
    });
});
