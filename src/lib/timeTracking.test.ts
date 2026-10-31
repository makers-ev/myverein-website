import { describe, expect, it } from 'vitest';

import { MAX_REPORT_PEOPLE, defaultRange, manualProblem, rateBody, reportQuery, reportRows, splitMinutes, toggleId, totalHours } from './timeTracking';

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
