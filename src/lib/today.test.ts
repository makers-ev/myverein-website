import { describe, expect, it } from 'vitest';

import { boardTodos, hasOpenItems, isOverdue, type TodayData } from '@/lib/today';

const empty: TodayData = { generatedAt: '2026-01-01T00:00:00Z', openRsvps: [], cancelled: [], unreadAnnouncements: 0, dueReturns: [], openBallots: 0 };

describe('today', () => {
    it('is empty when nothing is open, the member count alone is no to-do', () => {
        expect(hasOpenItems(empty)).toBe(false);
        expect(hasOpenItems({ ...empty, board: { memberCount: 40 } })).toBe(false);
    });
    it('counts any open item', () => {
        expect(hasOpenItems({ ...empty, unreadAnnouncements: 1 })).toBe(true);
        expect(hasOpenItems({ ...empty, board: { openApplications: 2 } })).toBe(true);
    });
    it('lists only board to-dos above zero', () => {
        expect(boardTodos({ ...empty, board: { openApplications: 2, openExits: 0, maintenanceDue: 1 } })).toEqual([
            { key: 'openApplications', count: 2 },
            { key: 'maintenanceDue', count: 1 },
        ]);
    });
    it('flags overdue returns', () => {
        expect(isOverdue('2026-01-01T00:00:00Z', Date.parse('2026-01-02T00:00:00Z'))).toBe(true);
    });
});
