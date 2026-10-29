import { describe, expect, it } from 'vitest';

import { breadcrumbsFor, buildNavGroups, isEntryActive } from '@/lib/navigation';

const ids = (g: ReturnType<typeof buildNavGroups>) => g.map((x) => x.id);
const base = { hasClub: true, hasWards: false, roles: [{ roleType: 'mitglied' }] };

describe('buildNavGroups', () => {
    it('gives a plain member no Verwaltung group', () => {
        const g = buildNavGroups({ ...base, permissions: [] });
        expect(ids(g)).not.toContain('admin');
        expect(ids(g)).toEqual(['today', 'club', 'calendar', 'places', 'documents']);
    });
    it('shows nothing admin while permissions are unknown', () => {
        expect(ids(buildNavGroups({ ...base, permissions: null }))).not.toContain('admin');
    });
    it('adds only the entries the permissions allow', () => {
        const g = buildNavGroups({ ...base, permissions: ['members:write', 'club_stats:read'] });
        const admin = g.find((x) => x.id === 'admin')!;
        expect(admin.entries.map((e) => e.id)).toEqual(['applications', 'exits', 'stats', 'settings']);
    });
    it('reduces a guardian-only account to the family area', () => {
        const g = buildNavGroups({ hasClub: false, hasWards: true, permissions: null, roles: [] });
        expect(g).toHaveLength(1);
        expect(g[0]!.entries[0]!.href).toBe('/familie');
    });
    it('offers the family link to a member with wards', () => {
        const g = buildNavGroups({ ...base, hasWards: true, permissions: [] });
        expect(g.find((x) => x.id === 'club')!.entries.some((e) => e.id === 'family')).toBe(true);
    });
});

describe('breadcrumbsFor / isEntryActive', () => {
    it('builds Home > page > tab', () => {
        expect(breadcrumbsFor('/verein', 'austritte').map((c) => c.labelKey)).toEqual(['nav.heute', 'nav.verein', 'verein.tab.austritte']);
        expect(breadcrumbsFor('/heute', null)).toEqual([{ labelKey: 'nav.heute' }]);
        expect(breadcrumbsFor('/kalender', null).map((c) => c.labelKey)).toEqual(['nav.heute', 'nav.kalender']);
    });
    it('matches the club tab', () => {
        const [group] = buildNavGroups({ ...base, permissions: [] }).filter((x) => x.id === 'club');
        const info = group!.entries.find((e) => e.id === 'info')!;
        const members = group!.entries.find((e) => e.id === 'members')!;
        expect(isEntryActive(info, '/verein', null)).toBe(true);
        expect(isEntryActive(info, '/verein', 'mitglieder')).toBe(false);
        expect(isEntryActive(members, '/verein', 'mitglieder')).toBe(true);
    });
});
