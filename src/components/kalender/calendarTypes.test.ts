import { describe, expect, it } from 'vitest';

import { type Calendar, defaultCalendarId, eventDayKeys, isContinuation, isLockedDefaultCalendar, seatsLabel, timeChanged } from './calendarTypes';

const cal = (id: string, isDefault = false): Calendar => ({ id, clubId: 'c', departmentId: null, name: id, isDefault, icalImportUrl: null });

describe('isLockedDefaultCalendar', () => {
    it('locks the default calendar only while it is the only one', () => {
        const only = cal('a', true);
        expect(isLockedDefaultCalendar(only, [only])).toBe(true);
        expect(isLockedDefaultCalendar(only, [only, cal('b')])).toBe(false);
        expect(isLockedDefaultCalendar(cal('b'), [cal('b')])).toBe(false);
    });
});

describe('defaultCalendarId', () => {
    it('prefers the default, falls back to the first, else empty', () => {
        expect(defaultCalendarId([cal('a'), cal('b', true)])).toBe('b');
        expect(defaultCalendarId([cal('a'), cal('b')])).toBe('a');
        expect(defaultCalendarId([])).toBe('');
    });
});

describe('timeChanged', () => {
    const event = { startsAt: '2030-05-01T16:00:00.000Z', endsAt: '2030-05-01T18:00:00.000Z' };

    it('detects a moved start or end, ignoring formatting of the same instant', () => {
        expect(timeChanged(event, '2030-05-01T16:00:00Z', '2030-05-01T18:00:00Z')).toBe(false);
        expect(timeChanged(event, '2030-05-01T17:00:00.000Z', '2030-05-01T18:00:00.000Z')).toBe(true);
        expect(timeChanged(event, '2030-05-01T16:00:00.000Z', null)).toBe(true);
        expect(timeChanged({ startsAt: event.startsAt, endsAt: null }, event.startsAt, null)).toBe(false);
    });
});

describe('eventDayKeys', () => {
    const local = (y: number, m: number, d: number, h = 0, min = 0, sec = 0) => new Date(y, m - 1, d, h, min, sec).toISOString();

    it('covers every day of a multi-day event and a single day otherwise', () => {
        expect(eventDayKeys({ startsAt: local(2030, 5, 30, 18), endsAt: local(2030, 6, 2, 12) })).toEqual(['2030-05-30', '2030-05-31', '2030-06-01', '2030-06-02']);
        expect(eventDayKeys({ startsAt: local(2030, 5, 1, 18), endsAt: null })).toEqual(['2030-05-01']);
    });

    it('treats an inclusive all-day end as the last day and a midnight end as the day before', () => {
        expect(eventDayKeys({ startsAt: local(2030, 5, 1), endsAt: local(2030, 5, 3, 23, 59, 59) })).toHaveLength(3);
        expect(eventDayKeys({ startsAt: local(2030, 5, 1, 20), endsAt: local(2030, 5, 2) })).toEqual(['2030-05-01']);
    });

    it('marks later days as continuation', () => {
        const ev = { startsAt: local(2030, 5, 1, 18) };
        expect(isContinuation(ev, '2030-05-01')).toBe(false);
        expect(isContinuation(ev, '2030-05-02')).toBe(true);
    });
});

describe('seatsLabel', () => {
    it('shows count of capacity', () => {
        expect(seatsLabel({ attendeeCount: 12, capacity: 15 })).toBe('12/15');
        expect(seatsLabel({ attendeeCount: 3, capacity: null })).toBe('3');
        expect(seatsLabel({ capacity: null })).toBe('0');
    });
});
