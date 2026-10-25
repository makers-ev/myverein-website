import { describe, expect, it } from 'vitest';

import { defaultRange, manualProblem, rateBody, splitMinutes } from './timeTracking';

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
        expect(manualProblem('2026-05-08T08:00:00Z', '2026-05-09T10:00:00Z', now)).toBe('long');
    });

    it('builds a rate with exactly one target', () => {
        expect(rateBody({ clubMemberId: 'm', roleType: null }, 1500, '2026-01-01', '')).toEqual({ clubMemberId: 'm', hourlyRateCents: 1500, validFrom: '2026-01-01' });
        expect(rateBody({ clubMemberId: null, roleType: 'trainer' }, 1500, '2026-01-01', '2026-12-31')).toEqual({ roleType: 'trainer', hourlyRateCents: 1500, validFrom: '2026-01-01', validUntil: '2026-12-31' });
    });

    it('defaults to the current month', () => {
        expect(defaultRange(new Date(2026, 4, 17))).toEqual({ from: '2026-05-01', to: '2026-05-17' });
    });
});
