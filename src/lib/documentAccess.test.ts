import { describe, expect, it } from 'vitest';

import { archiveVisible, documentsGate, documentsTabs, showsDocumentSettings } from './documentAccess';
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

describe('card and confirmation gates', () => {
    it('maps the card permissions', () => {
        expect(documentsGate(['member_cards:manage'])).toMatchObject({ cardsManage: true, cardsVerify: false });
        expect(documentsGate(['member_cards:verify'])).toMatchObject({ cardsVerify: true, cardsManage: false });
        expect(documentsGate(['documents:generate'])).toMatchObject({ generate: true, cardsManage: false });
    });
});

describe('documentsTabs', () => {
    it('gives every member confirmations and their own card, nothing else', () => {
        expect(documentsTabs([], false)).toEqual(['bestaetigungen', 'ausweis']);
        expect(documentsTabs(['members:read'], true)).toEqual(['archiv', 'bestaetigungen', 'ausweis']);
    });
    it('adds management tabs by permission only', () => {
        expect(documentsTabs(['documents:write'], true)).toEqual(['archiv', 'bestaetigungen', 'ausweis', 'verwalten']);
        expect(documentsTabs(['member_cards:verify'], false)).toEqual(['bestaetigungen', 'ausweis', 'pruefen']);
        expect(documentsTabs(['documents:manage', 'member_cards:manage', 'member_cards:verify'], true)).toEqual(['archiv', 'bestaetigungen', 'ausweis', 'verwalten', 'ausweise', 'pruefen']);
        expect(documentsTabs(['documents:generate'], false)).toEqual(['bestaetigungen', 'ausweis']);
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
