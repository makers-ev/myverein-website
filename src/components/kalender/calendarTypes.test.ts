import { describe, expect, it } from 'vitest';

import { type Calendar, defaultCalendarId, isLockedDefaultCalendar, timeChanged } from './calendarTypes';

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
