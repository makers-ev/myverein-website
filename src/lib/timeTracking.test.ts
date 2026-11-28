import { afterAll, describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { MAX_REPORT_PEOPLE, isAmbiguousLocal, isStaleEndError, toLocalValue, clockOutErrorKey, endTimeErrorKey, endTimeProblem, entryMarks, isOverdue, latestEnd, runningState, RATE_ROLES, groupRateCards, rateErrorKey, ratePatchBody, rateRangeProblem, rateRoleKey, defaultRange, manualProblem, rateBody, reportQuery, reportRows, splitMinutes, toggleId, totalHours } from './timeTracking';

describe('time tracking helpers', () => {
    it('splits minutes', () => {
        expect(splitMinutes(135)).toEqual({ hours: 2, minutes: 15 });
        expect(splitMinutes(-5)).toEqual({ hours: 0, minutes: 0 });
    });

    it('checks manual entries', () => {
        const now = new Date('2026-05-10T12:00:00Z').getTime();
        expect(manualProblem('2026-05-10T08:00:00Z', '2026-05-10T10:00:00Z', now)).toBeNull();
        expect(manualProblem('2026-05-10T10:00:00Z', '2026-05-10T08:00:00Z', now)).toBe('order');
        expect(manualProblem('2026-05-10T10:00:00Z', '2026-05-10T14:00:00Z', now)).toBe('future');
        expect(manualProblem('2026-05-09T08:00:00Z', '2026-05-10T01:00:00Z', now)).toBe('long');
    });

    it('builds a rate with exactly one target', () => {
        expect(rateBody({ clubMemberId: 'm', roleType: null }, 1500, '2026-01-01', '')).toEqual({ clubMemberId: 'm', hourlyRateCents: 1500, validFrom: '2026-01-01' });
        expect(rateBody({ clubMemberId: null, roleType: 'trainer' }, 1500, '2026-01-01', '2026-12-31')).toEqual({ roleType: 'trainer', hourlyRateCents: 1500, validFrom: '2026-01-01', validUntil: '2026-12-31' });
    });

    it('defaults to the current month', () => {
        expect(defaultRange(new Date(2026, 4, 17))).toEqual({ from: '2026-05-01', to: '2026-05-17' });
    });
});

describe('report helpers', () => {
    it('builds the report query without empty filters', () => {
        expect(reportQuery({ clubId: 'c', from: '2026-05-01', to: '2026-05-31' })).toBe('clubId=c&from=2026-05-01&to=2026-05-31');
        const q = new URLSearchParams(reportQuery({ clubId: 'c', from: 'a', to: 'b', departmentId: 'd', clubMemberIds: ['m1', 'm2'], roleTypes: ['trainer'], eventId: 'e', groupBy: 'person_event', format: 'xlsx' }));
        expect(q.get('clubMemberIds')).toBe('m1,m2');
        expect(q.get('roleTypes')).toBe('trainer');
        expect(q.get('groupBy')).toBe('person_event');
        expect(q.get('format')).toBe('xlsx');
        expect(new URLSearchParams(reportQuery({ clubId: 'c', from: 'a', to: 'b', format: 'json' })).has('format')).toBe(false);
    });

    it('caps the person list at the server limit', () => {
        const ids = Array.from({ length: MAX_REPORT_PEOPLE + 5 }, (_, i) => `m${i}`);
        expect(new URLSearchParams(reportQuery({ clubId: 'c', from: 'a', to: 'b', clubMemberIds: ids })).get('clubMemberIds')?.split(',')).toHaveLength(MAX_REPORT_PEOPLE);
        expect(toggleId(ids.slice(0, MAX_REPORT_PEOPLE), 'new')).toHaveLength(MAX_REPORT_PEOPLE);
        expect(toggleId(['a'], 'a')).toEqual([]);
        expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
    });

    it('reads rows and totals of old and new backends', () => {
        const totals = { minutes: 90, amountCents: null };
        expect(reportRows({ range: { from: 'a', to: 'b' }, includesRates: false, note: '', people: [], totals })).toEqual([]);
        expect(reportRows({ range: { from: 'a', to: 'b' }, includesRates: false, note: '', rows: [{ displayName: 'A' }], totals })).toHaveLength(1);
        expect(totalHours({ range: { from: 'a', to: 'b' }, includesRates: false, note: '', totals })).toBe(1.5);
    });
});

describe('rate card helpers', () => {
    const card = (o: Partial<import('./timeTracking').RateCard>) => ({ id: 'x', clubMemberId: null, displayName: null, roleType: null, hourlyRateCents: 1000, validFrom: '2026-01-01', validUntil: null, ...o });

    it('offers every club role incl. the implicit member role', () => {
        expect(RATE_ROLES).toContain('mitglied');
        expect(RATE_ROLES).toHaveLength(9);
        expect(rateRoleKey('mitglied')).toBe('time.role.mitglied');
        expect(rateRoleKey('trainer')).toBe('verein.role.trainer');
    });

    it('validates the period', () => {
        expect(rateRangeProblem('2026-02-01', '2026-01-01')).toBe('order');
        expect(rateRangeProblem('2026-02-01', '2026-02-01')).toBeNull();
        expect(rateRangeProblem('2026-02-01', '')).toBeNull();
    });

    it('builds the PATCH body, clearing the end date with null', () => {
        expect(ratePatchBody(1500, '2026-01-01', '')).toEqual({ hourlyRateCents: 1500, validFrom: '2026-01-01', validUntil: null });
        expect(ratePatchBody(1500, '2026-01-01', '2026-06-30').validUntil).toBe('2026-06-30');
    });

    it('groups role and person cards, newest first', () => {
        const g = groupRateCards([
            card({ id: 'a', roleType: 'trainer', validFrom: '2025-01-01' }),
            card({ id: 'b', roleType: 'trainer', validFrom: '2026-01-01' }),
            card({ id: 'c', roleType: 'mitglied' }),
            card({ id: 'd', clubMemberId: 'm', displayName: 'Zoe' }),
            card({ id: 'e', clubMemberId: 'n', displayName: 'Anna' }),
        ]);
        expect(g.roles.map((c) => c.id)).toEqual(['c', 'b', 'a']);
        expect(g.people.map((c) => c.id)).toEqual(['e', 'd']);
    });

    it('maps 409 to the overlap text', () => {
        expect(rateErrorKey(new ApiError(409, 'CONFLICT', 'x'))).toBe('events.err.rate_overlap');
    });
});

describe('running entry (clock-out recovery)', () => {
    const start = '2026-05-10T08:00:00Z';
    const at = (h: number, m = 0) => new Date(start).getTime() + (h * 60 + m) * 60_000;

    it('is quiet below 8 h, hints from 8 h and is stuck beyond 16 h', () => {
        expect(runningState(start, at(7, 59)).level).toBe('ok');
        expect(runningState(start, at(8)).level).toBe('hint');
        expect(runningState(start, at(16)).level).toBe('hint');
        expect(runningState(start, at(16, 1)).level).toBe('stuck');
        expect(runningState(start, at(328)).level).toBe('stuck');
    });

    it('splits the elapsed time into days, hours and minutes', () => {
        expect(runningState(start, at(328, 5))).toMatchObject({ days: 13, hours: 16, rest: 5, minutes: 328 * 60 + 5 });
        expect(runningState(start, at(-1)).minutes).toBe(0);
    });

    it('explains too_long on clock-out instead of the generic 16 h text', () => {
        expect(clockOutErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'x', { code: 'too_long' }))).toBe('time.err.clockOutTooLong');
        expect(clockOutErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'none_running' }))).toBe('events.err.none_running');
    });
});

describe('setting the end afterwards', () => {
    const start = '2026-05-10T08:00:00Z';
    const now = new Date('2026-05-12T08:00:00Z').getTime();

    it('bounds the end by start + 16 h and never beyond now', () => {
        expect(latestEnd({ startedAt: start }, now)).toBe(new Date('2026-05-11T00:00:00Z').getTime());
        expect(latestEnd({ startedAt: start }, new Date('2026-05-10T10:00:00Z').getTime())).toBe(new Date('2026-05-10T10:00:00Z').getTime());
    });

    it('mirrors the server checks', () => {
        expect(endTimeProblem(start, '', now)).toBe('invalid');
        expect(endTimeProblem(start, toLocalValue(new Date('2026-05-10T07:00:00Z').getTime()), now)).toBe('order');
        expect(endTimeProblem(start, toLocalValue(new Date('2026-05-10T12:00:00Z').getTime()), now)).toBeNull();
        expect(endTimeProblem(start, toLocalValue(new Date('2026-05-11T01:00:00Z').getTime()), now)).toBe('long');
        expect(endTimeProblem(start, toLocalValue(new Date('2026-05-10T12:00:00Z').getTime()), new Date('2026-05-10T10:00:00Z').getTime())).toBe('future');
    });

    it('detects stuck entries from the flag or the age', () => {
        expect(isOverdue({ running: true, overdue: true, startedAt: start }, now)).toBe(true);
        expect(isOverdue({ running: true, startedAt: start }, now)).toBe(true);
        expect(isOverdue({ running: true, overdue: false, startedAt: start }, now)).toBe(false);
        expect(isOverdue({ running: false, startedAt: start }, now)).toBe(false);
    });

    it('marks how an end came about', () => {
        expect(entryMarks({})).toEqual([]);
        expect(entryMarks({ corrected: true })).toEqual(['corrected']);
        expect(entryMarks({ corrected: true, autoClosed: true })).toEqual(['autoClosed']);
        expect(entryMarks({ corrected: true, closedByOther: true })).toEqual(['closedByOther']);
    });

    it('maps end-time errors', () => {
        const e = (code: string, status = 422) => new ApiError(status, 'X', 'x', { code });
        expect(endTimeErrorKey(e('too_long'))).toBe('time.err.endTooLong');
        for (const code of ['needs_end_time', 'invalid_time', 'in_future', 'entry_overlap']) expect(endTimeErrorKey(e(code))).toBe(`events.err.${code}`);
        expect(clockOutErrorKey(e('needs_end_time', 409))).toBe('events.err.needs_end_time');
    });
});

describe('daylight saving and stale errors', () => {
    const old = process.env.TZ;
    afterAll(() => {
        if (old === undefined) delete process.env.TZ;
        else process.env.TZ = old;
    });

    it('flags the doubled hour when the clocks go back', () => {
        process.env.TZ = 'Europe/Berlin';
        expect(isAmbiguousLocal('2026-10-25T02:30')).toBe(true);
        expect(isAmbiguousLocal('2026-10-25T01:30')).toBe(false);
        expect(isAmbiguousLocal('2026-10-25T03:30')).toBe(false);
        expect(isAmbiguousLocal('2026-06-25T02:30')).toBe(false);
        expect(isAmbiguousLocal('')).toBe(false);
    });

    it('treats not_running, not_overdue and entry_overlap as stale', () => {
        const e = (code: string) => new ApiError(409, 'CONFLICT', 'x', { code });
        expect(isStaleEndError(e('not_running'))).toBe(true);
        expect(isStaleEndError(e('not_overdue'))).toBe(true);
        expect(isStaleEndError(e('entry_overlap'))).toBe(true);
        expect(isStaleEndError(e('in_future'))).toBe(false);
        expect(isStaleEndError(new Error('x'))).toBe(false);
    });
});
