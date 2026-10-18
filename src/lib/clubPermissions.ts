/**
 * Permission gating of the club area (Wave 8 W7). The permission strings come from `GET /club-members/me` (`permissions`);
 * the backend enforces every one of them again, the UI only hides or disables what the caller may not use. Deny-by-default:
 * a missing or unknown permission grants nothing. Pure, so the gating rules are unit-tested.
 */

export type ClubTab = 'info' | 'profil' | 'mitglieder' | 'abteilungen' | 'austritte' | 'kennzahlen' | 'formulare' | 'zusatzfelder' | 'einstellungen';

export const can = (permissions: readonly string[] | null | undefined, permission: string): boolean => !!permissions && permissions.includes(permission);

/** Guardians (external role `erziehungsberechtigt` only, no permissions) have no right to the member list. */
export function isGuardianOnly(permissions: readonly string[], roles: ReadonlyArray<{ roleType: string }>): boolean {
    return permissions.length === 0 && roles.length > 0 && roles.every((r) => r.roleType === 'erziehungsberechtigt');
}

/** Tabs of the club page for a caller, in display order. */
export function visibleTabs(permissions: readonly string[], roles: ReadonlyArray<{ roleType: string }>): ClubTab[] {
    const tabs: ClubTab[] = isGuardianOnly(permissions, roles) ? ['info', 'profil', 'abteilungen'] : ['info', 'profil', 'mitglieder', 'abteilungen'];
    if (can(permissions, 'members:write')) tabs.push('austritte');
    if (can(permissions, 'club_stats:read')) tabs.push('kennzahlen');
    if (can(permissions, 'forms:write')) tabs.push('formulare', 'zusatzfelder');
    // Club rules and reminders hang on members:write, the club's mail template on announcements:write (Wave 9 W6).
    if (can(permissions, 'members:write') || can(permissions, 'announcements:write')) tabs.push('einstellungen');
    return tabs;
}

/** Roles that see the credential overview besides the board (backend `FUNKTIONSTRAEGER_ROLES`). */
const FUNKTIONSTRAEGER = ['trainer', 'abteilungsleitung'] as const;

/**
 * Whether to offer the "Qualifikationen" view: board-level (`members:write` / `members:read_sensitive`) or a Funktionsträger role.
 * Only a signal to show the switch -- the endpoint answers 403 for everybody else and that is handled in the view.
 */
export function canSeeCredentialOverview(permissions: readonly string[] | null | undefined, roles: ReadonlyArray<{ roleType: string }> | null | undefined): boolean {
    return can(permissions, 'members:write') || can(permissions, 'members:read_sensitive') || !!roles?.some((r) => (FUNKTIONSTRAEGER as readonly string[]).includes(r.roleType));
}

/** What the caller may do with forms and custom fields (Wave 8). */
export interface FormsGate {
    /** Form editor, custom field definitions (`forms:write`). */
    manage: boolean;
    /** Edit the custom field values of a member as the board (`members:write`; protected fields additionally need `readSensitive`). */
    editMemberValues: boolean;
    /** See and write protected custom fields, lower their protection (`members:read_sensitive`). */
    readSensitive: boolean;
    /** Decide applications and exit requests, where the submitted answers are shown (`members:write`). */
    review: boolean;
}

export function formsGate(permissions: readonly string[] | null | undefined): FormsGate {
    return {
        manage: can(permissions, 'forms:write'),
        editMemberValues: can(permissions, 'members:write'),
        readSensitive: can(permissions, 'members:read_sensitive'),
        review: can(permissions, 'members:write'),
    };
}
