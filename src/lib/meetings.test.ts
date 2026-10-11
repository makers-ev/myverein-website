import { describe, expect, it } from 'vitest';

import { buildAttendancePatch, effectiveAttendance, fromDatetimeLocal, meetingTypeKey, toDatetimeLocal, type AttendanceRow } from './meetings';

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
