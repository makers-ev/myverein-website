import { describe, expect, it } from 'vitest';

import { type AttendanceEntry, type AttendanceView, applyPending, changeFor, markAllPresent, percent, summarize, supervisionMissing, toggledStatus } from './attendance';

const entry = (over: Partial<AttendanceEntry>): AttendanceEntry => ({
    key: 'm:1',
    attendanceId: null,
    clubMemberId: '1',
    guestName: null,
    displayName: 'A',
    status: null,
    source: null,
    prefilled: false,
    rsvp: null,
    onRoster: true,
    isMinor: false,
    hasAccount: true,
    ...over,
});

describe('attendance helpers', () => {
    it('summarizes open and decided entries', () => {
        expect(summarize([entry({ status: 'anwesend' }), entry({ status: 'entschuldigt' }), entry({ status: null }), entry({ status: null })])).toEqual({ anwesend: 1, entschuldigt: 1, unentschuldigt: 0, offen: 2 });
    });

    it('toggles the active status back to open', () => {
        expect(toggledStatus('anwesend', 'anwesend')).toBeNull();
        expect(toggledStatus(null, 'anwesend')).toBe('anwesend');
        expect(toggledStatus('entschuldigt', 'anwesend')).toBe('anwesend');
    });

    it('identifies members by club member id and guests by attendance id', () => {
        expect(changeFor({ clubMemberId: 'c', attendanceId: null }, 'anwesend')).toEqual({ clubMemberId: 'c', status: 'anwesend' });
        expect(changeFor({ clubMemberId: null, attendanceId: 'a' }, null)).toEqual({ attendanceId: 'a', status: null });
        expect(changeFor({ clubMemberId: null, attendanceId: null }, null)).toBeNull();
    });

    it('marks only open entries as present and keeps pre-filled excuses', () => {
        const changes = markAllPresent([entry({ key: 'm:1', clubMemberId: '1' }), entry({ key: 'm:2', clubMemberId: '2', status: 'entschuldigt', prefilled: true }), entry({ key: 'm:3', clubMemberId: '3', status: 'unentschuldigt' })]);
        expect(changes).toEqual([{ clubMemberId: '1', status: 'anwesend' }]);
    });

    it('lays pending changes over a server view and recomputes the summary', () => {
        const view = { entries: [entry({ key: 'm:1' }), entry({ key: 'm:2', clubMemberId: '2', status: 'entschuldigt', prefilled: true })], summary: { anwesend: 0, entschuldigt: 1, unentschuldigt: 0, offen: 1 } } as AttendanceView;
        const next = applyPending(view, new Map([['m:1', 'anwesend' as const], ['m:2', null]]));
        expect(next.summary).toEqual({ anwesend: 1, entschuldigt: 0, unentschuldigt: 0, offen: 1 });
        expect(next.entries[1]!.prefilled).toBe(false);
        expect(applyPending(view, new Map())).toBe(view);
    });

    it('warns when minors are present without a supervisor', () => {
        expect(supervisionMissing([entry({ isMinor: true, status: 'anwesend' })], [])).toBe(true);
        expect(supervisionMissing([entry({ isMinor: true, status: 'anwesend' })], [{}])).toBe(false);
        expect(supervisionMissing([entry({ isMinor: true, status: 'entschuldigt' })], [])).toBe(false);
    });

    it('formats the quota as whole percent', () => {
        expect(percent(0.756)).toBe('76 %');
        expect(percent(null)).toBeNull();
    });
});
