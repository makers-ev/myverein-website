import { can } from './clubPermissions';

/**
 * Wave 12 W9: gating of the event tools (attendance, participant list, helper management, time tracking). The permission
 * strings come from `GET /club-members/me`; the backend enforces them again, including the department scope, so this only
 * decides what is shown. Deny-by-default: a missing permission, an unknown role or a missing calendar grants nothing.
 */

export interface EventMe {
    clubMemberId: string | null;
    permissions: string[];
    roles: Array<{ roleType: string; departmentId?: string | null }>;
    departments?: Array<{ id: string }>;
}

export type EventPermission = 'attendance:write' | 'attendance:read' | 'registrations:read' | 'helpers:write' | 'time:write' | 'time:read_rates' | 'calendars:write';

/** Roles that hold a permission club-wide (mirrors the backend rights table); everybody else is limited to their departments. */
const CLUB_WIDE: Record<string, readonly string[]> = {
    vorsitz: ['attendance:write', 'attendance:read', 'registrations:read', 'helpers:write', 'time:write', 'time:read_rates'],
    stellv_vorsitz: ['attendance:write', 'attendance:read', 'registrations:read', 'helpers:write', 'time:write', 'time:read_rates'],
    schriftfuehrer: ['helpers:write'],
    kassenwart: ['time:read_rates'],
};

/** Ids of the departments the caller belongs to (department-bound roles and current memberships). */
export function ownDepartmentIds(me: Pick<EventMe, 'roles' | 'departments'>): Set<string> {
    const ids = new Set<string>();
    for (const r of me.roles) if (r.departmentId) ids.add(r.departmentId);
    for (const d of me.departments ?? []) ids.add(d.id);
    return ids;
}

/** Whether the permission applies to every event of the club (board) rather than only to the caller's departments. */
export function holdsClubWide(me: Pick<EventMe, 'roles'>, permission: EventPermission): boolean {
    return me.roles.some((r) => CLUB_WIDE[r.roleType]?.includes(permission));
}

/** Permission present in `permissions` AND (club-wide role OR the event's calendar belongs to one of the caller's departments). */
export function canForCalendar(me: EventMe | null | undefined, permission: EventPermission, calendar: { departmentId: string | null } | null | undefined): boolean {
    if (!me || !can(me.permissions, permission)) return false;
    if (holdsClubWide(me, permission)) return true;
    if (!calendar?.departmentId) return false;
    return ownDepartmentIds(me).has(calendar.departmentId);
}

/** Time tracking area: trainers, department leads and everybody who confirms (`time:write`). */
export function canUseTimeTracking(me: EventMe | null | undefined): boolean {
    if (!me) return false;
    return can(me.permissions, 'time:write') || me.roles.some((r) => r.roleType === 'trainer' || r.roleType === 'abteilungsleitung');
}

/** Group views of the attendance report. */
export function canSeeAttendanceGroup(me: EventMe | null | undefined): boolean {
    return !!me && can(me.permissions, 'attendance:read');
}

export type EventTab = 'details' | 'registration' | 'participants' | 'attendance' | 'helpers' | 'rides';

/**
 * Tabs of the event dialog for a caller. Details, helpers and rides are for every reader of the event (self-service only,
 * management inside them is gated by the server's `canManage`); the rest is permission- and department-scoped.
 */
export function visibleEventTabs(
    me: EventMe | null | undefined,
    calendar: { departmentId: string | null } | null | undefined,
    flags: { registrationEnabled: boolean; canManageRegistration: boolean } = { registrationEnabled: false, canManageRegistration: false },
): EventTab[] {
    const tabs: EventTab[] = ['details'];
    if (flags.registrationEnabled || flags.canManageRegistration) tabs.push('registration');
    if (canForCalendar(me, 'registrations:read', calendar)) tabs.push('participants');
    if (canForCalendar(me, 'attendance:read', calendar)) tabs.push('attendance');
    tabs.push('helpers', 'rides');
    return tabs;
}
