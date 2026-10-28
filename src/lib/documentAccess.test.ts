import { describe, expect, it } from 'vitest';

import { archiveVisible, documentsGate, showsDocumentSettings } from './documentAccess';
import { visibleTabs } from './clubPermissions';

describe('documentsGate', () => {
    it('grants nothing without permissions or for unknown ones', () => {
        for (const p of [null, undefined, [], ['documents:unknown', 'documents']]) expect(Object.values(documentsGate(p)).some(Boolean)).toBe(false);
    });
    it('maps each permission to exactly one switch', () => {
        expect(documentsGate(['documents:manage'])).toMatchObject({ manage: true, write: false, readPersonal: false });
        expect(documentsGate(['documents:read_personal']).readPersonal).toBe(true);
        expect(documentsGate(['club_info:write']).editClubInfo).toBe(true);
        expect(documentsGate(['branding:write'])).toMatchObject({ branding: true, storage: false });
        expect(documentsGate(['storage:read'])).toMatchObject({ storage: true, branding: false });
    });
});

describe('archiveVisible', () => {
    it('needs a readable folder or a root level', () => {
        expect(archiveVisible(null)).toBe(false);
        expect(archiveVisible({ data: [], rootLevel: null })).toBe(false);
        expect(archiveVisible({ data: [], rootLevel: 'lesen' })).toBe(true);
        expect(archiveVisible({ data: [{ id: '1', parentId: null, name: 'x', systemKey: null, level: 'lesen' }], rootLevel: null })).toBe(true);
    });
});

describe('settings tab', () => {
    it('shows for branding or storage only', () => {
        expect(showsDocumentSettings(['storage:read'])).toBe(true);
        expect(showsDocumentSettings(['branding:write'])).toBe(true);
        expect(showsDocumentSettings(['documents:write'])).toBe(false);
        expect(visibleTabs(['storage:read'], [{ roleType: 'kassenwart' }])).toContain('einstellungen');
        expect(visibleTabs([], [{ roleType: 'mitglied' }])).not.toContain('einstellungen');
    });
});
