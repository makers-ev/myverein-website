import { describe, expect, it } from 'vitest';

import { type OccupancyItem, addDays, blockOnDay, bookingProblem, rangeQuery, weekStart } from './occupancy';

const item = (startsAt: string, endsAt: string): OccupancyItem => ({ type: 'booking', id: 'b', title: 'T', startsAt, endsAt, eventId: null });

describe('occupancy', () => {
    it('finds the Monday of a week', () => {
        expect(weekStart(new Date(2026, 4, 6)).getDay()).toBe(1);
        expect(weekStart(new Date(2026, 4, 3)).getDate()).toBe(27); // Sunday 3 May 2026 -> Monday 27 April
        expect(weekStart(new Date(2026, 4, 4)).getDate()).toBe(4);
    });

    it('positions a block inside the visible hours', () => {
        const day = new Date(2026, 4, 5);
        const b = blockOnDay(item(new Date(2026, 4, 5, 6).toISOString(), new Date(2026, 4, 5, 14, 30).toISOString()), day)!;
        expect(b.top).toBe(0);
        expect(Math.round(b.height)).toBe(50);
    });

    it('clips blocks to the day and drops other days', () => {
        const day = new Date(2026, 4, 5);
        const long = item(new Date(2026, 4, 4, 20).toISOString(), new Date(2026, 4, 6, 8).toISOString());
        expect(blockOnDay(long, day)!.height).toBe(100);
        expect(blockOnDay(item(new Date(2026, 4, 6, 8).toISOString(), new Date(2026, 4, 6, 9).toISOString()), day)).toBeNull();
    });

    it('builds the range query and adds days', () => {
        expect(addDays(new Date(2026, 0, 31), 1).getMonth()).toBe(1);
        expect(rangeQuery(new Date(Date.UTC(2026, 0, 1)), 7)).toContain('from=2026-01-01T00%3A00%3A00.000Z');
    });

    it('checks the booking form', () => {
        expect(bookingProblem('', '2026-05-01T10:00', '2026-05-01T11:00')).toBe('title');
        expect(bookingProblem('A', '2026-05-01T11:00', '2026-05-01T10:00')).toBe('order');
        expect(bookingProblem('A', '2026-05-01T10:00', '2026-05-01T11:00')).toBeNull();
    });
});
