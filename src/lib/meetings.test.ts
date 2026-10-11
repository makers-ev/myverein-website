import { describe, expect, it } from 'vitest';

import { buildAttendancePatch, effectiveAttendance, formatMeetingDateTime, fromDatetimeLocal, meetingTypeKey, resolutionChanges, statusForSchedule, toDatetimeLocal, type AttendanceRow } from './meetings';

const stored: AttendanceRow[] = [
    { memberId: 'a', present: true, hasVotingRight: true, proxyForMemberId: null },
    { memberId: 'b', present: false, hasVotingRight: false, proxyForMemberId: 'c' },
];

describe('buildAttendancePatch', () => {
    it('sends nothing without edits (no blind present:false overwrite)', () => {
        expect(buildAttendancePatch(stored, {})).toEqual([]);
    });
    it('sends only the changed field of the touched member', () => {
        expect(buildAttendancePatch(stored, { a: { present: false } })).toEqual([{ memberId: 'a', present: false }]);
        expect(buildAttendancePatch(stored, { b: { hasVotingRight: true } })).toEqual([{ memberId: 'b', hasVotingRight: true }]);
    });
    it('drops edits equal to the stored value', () => {
        expect(buildAttendancePatch(stored, { a: { present: true, hasVotingRight: true } })).toEqual([]);
    });
    it('clears a proxy with null and sets a new one', () => {
        expect(buildAttendancePatch(stored, { b: { proxyForMemberId: null } })).toEqual([{ memberId: 'b', proxyForMemberId: null }]);
        expect(buildAttendancePatch(stored, { a: { proxyForMemberId: 'b' } })).toEqual([{ memberId: 'a', proxyForMemberId: 'b' }]);
    });
    it('compares members without a stored row with the backend defaults', () => {
        expect(buildAttendancePatch(stored, { z: { present: false, hasVotingRight: true, proxyForMemberId: null } })).toEqual([]);
        expect(buildAttendancePatch(stored, { z: { present: true } })).toEqual([{ memberId: 'z', present: true }]);
    });
});

describe('effectiveAttendance', () => {
    it('prefers the pending edit, then the stored row, then the defaults', () => {
        expect(effectiveAttendance(stored[1], { present: true })).toEqual({ present: true, hasVotingRight: false, proxyForMemberId: 'c' });
        expect(effectiveAttendance(undefined, undefined)).toEqual({ present: false, hasVotingRight: true, proxyForMemberId: null });
        expect(effectiveAttendance(stored[1], { proxyForMemberId: null }).proxyForMemberId).toBeNull();
    });
});

describe('meetingTypeKey', () => {
    it('maps enum values and leaves legacy ones alone', () => {
        expect(meetingTypeKey('sonstige')).toBe('treffen.type.sonstige');
        expect(meetingTypeKey('Vorstandstreffen')).toBeNull();
    });
});

describe('Europe/Berlin conversion', () => {
    it('reads the input as Berlin wall-clock time (summer and winter)', () => {
        expect(fromDatetimeLocal('2026-07-01T18:30')).toBe('2026-07-01T16:30:00.000Z');
        expect(fromDatetimeLocal('2026-12-01T18:30')).toBe('2026-12-01T17:30:00.000Z');
    });
    it('shows an instant as Berlin wall-clock time, independent of the browser zone', () => {
        expect(toDatetimeLocal('2026-07-01T16:30:00.000Z')).toBe('2026-07-01T18:30');
        expect(toDatetimeLocal('2026-12-31T23:30:00.000Z')).toBe('2027-01-01T00:30');
    });
    it('is stable around the DST switch', () => {
        expect(fromDatetimeLocal('2026-03-29T12:00')).toBe('2026-03-29T10:00:00.000Z');
        expect(toDatetimeLocal(fromDatetimeLocal('2026-10-25T12:00'))).toBe('2026-10-25T12:00');
    });
    it('formats with time zone and language', () => {
        expect(formatMeetingDateTime('2026-12-31T23:30:00.000Z', 'de')).toContain('01.01.27');
        expect(formatMeetingDateTime('2026-07-01T16:30:00.000Z', 'de')).toContain('18:30');
    });
});

describe('statusForSchedule', () => {
    it('moves between terminfindung and geplant with the date', () => {
        expect(statusForSchedule('terminfindung', '2026-07-01T16:30:00.000Z')).toBe('geplant');
        expect(statusForSchedule('geplant', null)).toBe('terminfindung');
    });
    it('leaves later statuses alone', () => {
        expect(statusForSchedule('abgehalten', '2026-07-01T16:30:00.000Z')).toBeUndefined();
        expect(statusForSchedule('protokolliert', null)).toBeUndefined();
        expect(statusForSchedule('geplant', '2026-07-01T16:30:00.000Z')).toBeUndefined();
    });
});

describe('datetime-local conversion', () => {
    it('round-trips an instant at minute precision', () => {
        const iso = '2026-11-03T18:30:00.000Z';
        expect(fromDatetimeLocal(toDatetimeLocal(iso))).toBe(iso);
    });
    it('handles empty and invalid input', () => {
        expect(toDatetimeLocal(null)).toBe('');
        expect(toDatetimeLocal('nope')).toBe('');
        expect(fromDatetimeLocal('')).toBeNull();
    });
});

describe('resolutionChanges', () => {
    const r = { description: 'Budget', votesFor: 5, votesAgainst: 1, votesAbstain: 0, result: 'angenommen' };
    it('returns only changed fields', () => {
        expect(resolutionChanges(r, { description: 'Budget', votesFor: '6', votesAgainst: '1', votesAbstain: '0', result: ' angenommen ' })).toEqual({ votesFor: 6 });
    });
    it('returns nothing when unchanged and never sends negative or blank values', () => {
        expect(resolutionChanges(r, { description: 'Budget', votesFor: '5', votesAgainst: '1', votesAbstain: '0', result: 'angenommen' })).toEqual({});
        expect(resolutionChanges(r, { description: '  ', votesFor: '-3', votesAgainst: '1', votesAbstain: '', result: '' })).toEqual({ votesFor: 0 });
    });
});
