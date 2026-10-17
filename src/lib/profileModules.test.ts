import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));

import { asCatalog, type CatalogModule, groupLabelKey, groupModules, limitView, moduleAudience, toggleBlock } from './profileModules';

const mod = (id: string, group: string, extra: Partial<CatalogModule> = {}): CatalogModule => ({
    id,
    group,
    label: id,
    description: '',
    helpText: null,
    type: 'text',
    options: null,
    validation: null,
    visibleTo: 'funktionstraeger',
    editableBy: 'self',
    sensitive: false,
    mandatory: false,
    neverMandatoryGroup: false,
    state: 'inactive',
    fieldId: null,
    customized: false,
    ...extra,
});

describe('groupModules', () => {
    const groups = [
        { id: 'fuehrerschein', label: 'Führerschein' },
        { id: 'qualifikationen', label: 'Qualifikationen' },
        { id: 'leer', label: 'Leer' },
    ];
    it('keeps the server order of groups and modules and drops empty groups', () => {
        const modules = [mod('b', 'qualifikationen'), mod('a', 'fuehrerschein'), mod('c', 'qualifikationen')];
        const views = groupModules({ groups, modules });
        expect(views.map((v) => v.group.id)).toEqual(['fuehrerschein', 'qualifikationen']);
        expect(views[1]!.modules.map((m) => m.id)).toEqual(['b', 'c']);
    });
    it('shows modules of an unknown group at the end instead of losing them', () => {
        const views = groupModules({ groups, modules: [mod('a', 'fuehrerschein'), mod('x', 'neu'), mod('y', 'neu')] });
        expect(views.map((v) => v.group.id)).toEqual(['fuehrerschein', 'neu']);
        expect(views[1]!.modules).toHaveLength(2);
        expect(groupLabelKey('neu')).toBeNull();
        expect(groupLabelKey('sport')).toBe('forms.mod.group.sport');
        expect(groupLabelKey('__proto__')).toBeNull();
    });
});

describe('moduleAudience', () => {
    it('says it plainly for each audience', () => {
        expect(moduleAudience({ visibleTo: 'funktionstraeger', sensitive: false })).toEqual({ key: 'forms.mod.aud.funktionstraeger', confidential: false });
        expect(moduleAudience({ visibleTo: 'vorstand', sensitive: true })).toEqual({ key: 'forms.mod.aud.vorstandConfidential', confidential: false });
        expect(moduleAudience({ visibleTo: 'vorstand', sensitive: false }).key).toBe('forms.mod.aud.vorstand');
        expect(moduleAudience({ visibleTo: 'mitglied', sensitive: false }).key).toBe('forms.mod.aud.mitglied');
    });
    it('adds the confidential marker where the text does not say it', () => {
        expect(moduleAudience({ visibleTo: 'funktionstraeger', sensitive: true }).confidential).toBe(true);
    });
});

describe('limitView', () => {
    it('computes the meter', () => {
        expect(limitView({ used: 10, max: 100 })).toEqual({ used: 10, max: 100, remaining: 90, full: false, nearly: false, percent: 10 });
        expect(limitView({ used: 90, max: 100 })).toMatchObject({ nearly: true, full: false });
        expect(limitView({ used: 100, max: 100 })).toMatchObject({ full: true, remaining: 0, percent: 100 });
        expect(limitView({ used: 120, max: 100 })).toMatchObject({ full: true, remaining: 0, percent: 100 });
    });
});

describe('toggleBlock', () => {
    const full = { used: 100, max: 100 };
    const free = { used: 3, max: 100 };
    it('blocks a new module when the limit is reached, but not re-activating or deactivating', () => {
        expect(toggleBlock({ state: 'inactive', sensitive: false }, full, true)).toBe('limit');
        expect(toggleBlock({ state: 'archived', sensitive: false }, full, true)).toBeNull();
        expect(toggleBlock({ state: 'active', sensitive: false }, full, true)).toBeNull();
        expect(toggleBlock({ state: 'inactive', sensitive: false }, free, false)).toBeNull();
    });
    it('needs members:read_sensitive to activate (or restore) a sensitive module, but not to deactivate it', () => {
        for (const state of ['inactive', 'archived'] as const) {
            expect(toggleBlock({ state, sensitive: true }, free, false)).toBe('sensitive');
            expect(toggleBlock({ state, sensitive: true }, free, true)).toBeNull();
        }
        expect(toggleBlock({ state: 'active', sensitive: true }, free, false)).toBeNull();
        expect(toggleBlock({ state: 'active', sensitive: true }, free, true)).toBeNull();
    });
});

describe('asCatalog', () => {
    it('accepts the server shape and refuses anything else', () => {
        const ok = { data: { groups: [], modules: [], limit: { used: 1, max: 100 } } };
        expect(asCatalog(ok)).toEqual(ok.data);
        expect(asCatalog(null)).toBeNull();
        expect(asCatalog({ data: { groups: [], modules: [] } })).toBeNull();
        expect(asCatalog({ data: { groups: 'x', modules: [], limit: { used: 1, max: 2 } } })).toBeNull();
    });
});
