import { describe, expect, it } from 'vitest';

import { affectedSignups, createSeriesBody, daysInclusive, defaultRule, ruleBody, ruleFromSeries, ruleProblem, setPosOf, weekdayOf } from './eventSeries';

describe('weekdayOf / setPosOf', () => {
    it('maps a date to its weekday code and n-th weekday', () => {
        expect(weekdayOf('2030-05-06')).toBe('MO');
        expect(weekdayOf('2030-05-12')).toBe('SU');
        expect(setPosOf('2030-05-06')).toBe(1);
        expect(setPosOf('2030-05-22')).toBe(4);
        expect(setPosOf('2030-05-29')).toBe(-1);
    });
});

describe('ruleProblem', () => {
    it('validates interval, weekdays, end', () => {
        const rule = defaultRule('2030-05-06');
        expect(ruleProblem(rule, '2030-05-06')).toBeNull();
        expect(ruleProblem({ ...rule, interval: '0' }, '2030-05-06')).toBe('kalender.series.err.interval');
        expect(ruleProblem({ ...rule, byDay: [] }, '2030-05-06')).toBe('kalender.series.err.weekdays');
        expect(ruleProblem({ ...rule, endMode: 'until', untilDate: '2030-05-01' }, '2030-05-06')).toBe('kalender.series.err.until');
        expect(ruleProblem({ ...rule, endMode: 'count', count: '1001' }, '2030-05-06')).toBe('kalender.series.err.count');
    });
});

describe('ruleBody', () => {
    it('sends byDay for weekly, bySetPos for n-th weekday and exactly one end', () => {
        const rule = { ...defaultRule('2030-05-06'), byDay: ['WE' as const, 'MO' as const], endMode: 'count' as const, count: '5' };
        expect(ruleBody(rule, '2030-05-06')).toEqual({ freq: 'weekly', interval: 1, skipHolidays: false, byDay: ['MO', 'WE'], count: 5 });
        const monthly = { ...defaultRule('2030-05-22'), freq: 'monthly' as const, monthlyMode: 'nthWeekday' as const, endMode: 'until' as const, untilDate: '2030-12-31' };
        expect(ruleBody(monthly, '2030-05-22')).toEqual({ freq: 'monthly', interval: 1, skipHolidays: false, byDay: ['WE'], bySetPos: 4, untilDate: '2030-12-31' });
        expect(ruleBody({ ...rule, freq: 'daily' }, '2030-05-06')).not.toHaveProperty('byDay');
    });
});

describe('createSeriesBody', () => {
    const base = { title: 'Training', allDay: false, startDate: '2030-05-06', startTime: '18:00', endDate: '2030-05-06', endTime: '19:30' };
    it('derives the duration in minutes and omits empty optionals', () => {
        const body = createSeriesBody({ ...base, calendarId: 'c1' }, defaultRule(base.startDate));
        expect(body).toMatchObject({ calendarId: 'c1', title: 'Training', startTime: '18:00', durationMinutes: 90, freq: 'weekly' });
        expect(body).not.toHaveProperty('description');
    });
    it('uses durationDays and no time for all-day series', () => {
        const body = createSeriesBody({ ...base, allDay: true, endDate: '2030-05-08' }, defaultRule(base.startDate));
        expect(body).toMatchObject({ allDay: true, durationDays: 3 });
        expect(body).not.toHaveProperty('startTime');
    });
});

describe('misc', () => {
    it('counts days inclusively and sums sign-ups', () => {
        expect(daysInclusive('2030-05-01', '2030-05-01')).toBe(1);
        expect(daysInclusive('2030-05-30', '2030-06-02')).toBe(4);
        expect(affectedSignups({ attendeeCount: 4, waitlistCount: 2 })).toBe(6);
        expect(affectedSignups({})).toBe(0);
    });
    it('reads a series back into editor state', () => {
        const rule = ruleFromSeries({ id: 's', calendarId: 'c', freq: 'monthly', intervalCount: 2, byDay: ['TU'], bySetPos: -1, untilDate: null, count: 6, skipHolidays: true, startDate: '2030-05-28' });
        expect(rule).toMatchObject({ freq: 'monthly', interval: '2', monthlyMode: 'nthWeekday', endMode: 'count', count: '6', skipHolidays: true });
    });
});
