import { describe, expect, it } from 'vitest';

import { can, canSeeCredentialOverview, formsGate, isGuardianOnly, visibleTabs } from './clubPermissions';

const mitglied = { permissions: [] as string[], roles: [{ roleType: 'mitglied' }] };
const guardian = { permissions: [] as string[], roles: [{ roleType: 'erziehungsberechtigt' }] };
const schriftfuehrer = ['members:write', 'forms:write', 'members:read_sensitive', 'club_stats:read'];

describe('can', () => {
    it('denies by default', () => {
        expect(can([], 'forms:write')).toBe(false);
        expect(can(null, 'forms:write')).toBe(false);
        expect(can(undefined, 'forms:write')).toBe(false);
        expect(can(['forms:write'], 'forms:write')).toBe(true);
        expect(can(['forms:write'], 'forms')).toBe(false);
        expect(can(['members:write'], 'forms:write')).toBe(false);
    });
});

describe('visible tabs', () => {
    it('gives a plain member no board tab and no editor', () => {
        expect(visibleTabs(mitglied.permissions, mitglied.roles)).toEqual(['info', 'profil', 'mitglieder', 'abteilungen']);
    });

    it('gives a guardian only the basics', () => {
        expect(isGuardianOnly(guardian.permissions, guardian.roles)).toBe(true);
        expect(visibleTabs(guardian.permissions, guardian.roles)).toEqual(['info', 'profil', 'abteilungen']);
        expect(isGuardianOnly(['members:write'], guardian.roles)).toBe(false);
        expect(isGuardianOnly([], [])).toBe(false);
        expect(isGuardianOnly([], [{ roleType: 'erziehungsberechtigt' }, { roleType: 'trainer' }])).toBe(false);
    });

    it('shows the form editor and custom fields tabs only with forms:write', () => {
        expect(visibleTabs(['members:write'], mitglied.roles)).not.toContain('formulare');
        expect(visibleTabs(['members:write'], mitglied.roles)).not.toContain('zusatzfelder');
        expect(visibleTabs(['forms:write'], mitglied.roles)).toEqual(['info', 'profil', 'mitglieder', 'abteilungen', 'formulare', 'zusatzfelder']);
        expect(visibleTabs(schriftfuehrer, mitglied.roles)).toEqual(['info', 'profil', 'mitglieder', 'abteilungen', 'austritte', 'kennzahlen', 'formulare', 'zusatzfelder', 'einstellungen']);
    });

    it('never offers a tab twice', () => {
        const tabs = visibleTabs(schriftfuehrer, mitglied.roles);
        expect(new Set(tabs).size).toBe(tabs.length);
    });
});

describe('forms gate', () => {
    it('maps each action to its own permission', () => {
        expect(formsGate([])).toEqual({ manage: false, editMemberValues: false, readSensitive: false, review: false });
        expect(formsGate(['forms:write'])).toEqual({ manage: true, editMemberValues: false, readSensitive: false, review: false });
        expect(formsGate(['members:write'])).toEqual({ manage: false, editMemberValues: true, readSensitive: false, review: true });
        expect(formsGate(['members:read_sensitive'])).toEqual({ manage: false, editMemberValues: false, readSensitive: true, review: false });
        expect(formsGate(schriftfuehrer)).toEqual({ manage: true, editMemberValues: true, readSensitive: true, review: true });
        expect(formsGate(undefined).manage).toBe(false);
    });
});

describe('canSeeCredentialOverview', () => {
    it('is offered to board-level permissions and to trainers and department heads, deny-by-default otherwise', () => {
        expect(canSeeCredentialOverview(['members:write'], [])).toBe(true);
        expect(canSeeCredentialOverview(['members:read_sensitive'], [])).toBe(true);
        expect(canSeeCredentialOverview([], [{ roleType: 'trainer' }])).toBe(true);
        expect(canSeeCredentialOverview([], [{ roleType: 'abteilungsleitung' }])).toBe(true);
        expect(canSeeCredentialOverview([], [{ roleType: 'mitglied' }])).toBe(false);
        expect(canSeeCredentialOverview(['forms:write', 'club_stats:read'], [{ roleType: 'erziehungsberechtigt' }])).toBe(false);
        expect(canSeeCredentialOverview(null, undefined)).toBe(false);
    });
});
