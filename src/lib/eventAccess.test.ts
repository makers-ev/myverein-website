import { describe, expect, it } from 'vitest';

import { type EventMe, canForCalendar, canSeeAttendanceGroup, canTrackTime, canUseTimeTracking, holdsClubWide, ownDepartmentIds, visibleEventTabs } from './eventAccess';

const me = (over: Partial<EventMe>): EventMe => ({ clubMemberId: 'c1', permissions: [], roles: [], ...over });
const board = me({ permissions: ['attendance:read', 'attendance:write', 'registrations:read', 'helpers:write'], roles: [{ roleType: 'vorsitz' }] });
const trainerA = me({ permissions: ['attendance:read', 'attendance:write', 'registrations:read'], roles: [{ roleType: 'trainer', departmentId: 'A' }] });
const plain = me({ roles: [{ roleType: 'mitglied' }] });

describe('event access gating', () => {
    it('denies by default', () => {
        expect(canForCalendar(null, 'attendance:read', { departmentId: null })).toBe(false);
        expect(canForCalendar(plain, 'attendance:read', { departmentId: 'A' })).toBe(false);
        expect(canForCalendar(trainerA, 'attendance:read', null)).toBe(false);
    });

    it('lets the board act on every calendar', () => {
        expect(canForCalendar(board, 'attendance:write', { departmentId: 'B' })).toBe(true);
        expect(canForCalendar(board, 'attendance:write', { departmentId: null })).toBe(true);
    });

    it('limits trainers to their own departments', () => {
        expect(canForCalendar(trainerA, 'attendance:write', { departmentId: 'A' })).toBe(true);
        expect(canForCalendar(trainerA, 'attendance:write', { departmentId: 'B' })).toBe(false);
        expect(canForCalendar(trainerA, 'attendance:write', { departmentId: null })).toBe(false);
    });

    it('does not trust a role without the permission string', () => {
        expect(canForCalendar(me({ roles: [{ roleType: 'vorsitz' }] }), 'attendance:read', { departmentId: null })).toBe(false);
    });

    it('knows which roles are club-wide for which permission', () => {
        expect(holdsClubWide(me({ roles: [{ roleType: 'schriftfuehrer' }] }), 'helpers:write')).toBe(true);
        expect(holdsClubWide(me({ roles: [{ roleType: 'schriftfuehrer' }] }), 'attendance:read')).toBe(false);
        expect(holdsClubWide(me({ roles: [{ roleType: 'kassenwart' }] }), 'time:read_rates')).toBe(true);
    });

    it('scopes by department-bound trainer and lead roles only', () => {
        expect([...ownDepartmentIds(me({ roles: [{ roleType: 'trainer', departmentId: 'A' }, { roleType: 'abteilungsleitung', departmentId: 'C' }, { roleType: 'mitglied', departmentId: 'D' }] }))].sort()).toEqual(['A', 'C']);
    });

    it('shows time tracking only to trainers, department leads and confirmers', () => {
        expect(canUseTimeTracking(plain)).toBe(false);
        expect(canUseTimeTracking(trainerA)).toBe(true);
        expect(canUseTimeTracking(me({ permissions: ['time:write'] }))).toBe(true);
        expect(canUseTimeTracking(me({ permissions: ['time:read_rates'], roles: [{ roleType: 'kassenwart' }] }))).toBe(true);
        expect(canUseTimeTracking(null)).toBe(false);
    });

    it('lets rate readers alone see the report but not track hours', () => {
        const kassenwart = me({ permissions: ['time:read_rates'], roles: [{ roleType: 'kassenwart' }] });
        expect(canTrackTime(kassenwart)).toBe(false);
        expect(canTrackTime(trainerA)).toBe(true);
    });

    it('shows group attendance views only with attendance:read', () => {
        expect(canSeeAttendanceGroup(plain)).toBe(false);
        expect(canSeeAttendanceGroup(trainerA)).toBe(true);
    });

    it('builds the tab list per caller', () => {
        const off = { registrationEnabled: false, canManageRegistration: false };
        expect(visibleEventTabs(plain, { departmentId: 'A' }, off)).toEqual(['details', 'helpers', 'rides']);
        expect(visibleEventTabs(plain, { departmentId: 'A' }, { ...off, registrationEnabled: true })).toEqual(['details', 'registration', 'helpers', 'rides']);
        expect(visibleEventTabs(plain, { departmentId: 'A' }, { ...off, canManageRegistration: true })).toEqual(['details', 'registration', 'helpers', 'rides']);
        expect(visibleEventTabs(trainerA, { departmentId: 'A' }, off)).toEqual(['details', 'participants', 'attendance', 'helpers', 'rides']);
        expect(visibleEventTabs(trainerA, { departmentId: 'B' }, off)).toEqual(['details', 'helpers', 'rides']);
        expect(visibleEventTabs(board, { departmentId: null }, off)).toEqual(['details', 'participants', 'attendance', 'helpers', 'rides']);
    });
});

describe('canTrackTime server flag', () => {
    const base = { clubMemberId: 'm', permissions: [] as string[], roles: [] as Array<{ roleType: string }> };
    it('lets the server decision win over the role guess', () => {
        expect(canTrackTime({ ...base, canTrack: true })).toBe(true);
        expect(canTrackTime({ ...base, roles: [{ roleType: 'trainer' }], canTrack: false })).toBe(false);
        expect(canTrackTime({ ...base, roles: [{ roleType: 'trainer' }] })).toBe(true);
        expect(canTrackTime(base)).toBe(false);
    });
});
