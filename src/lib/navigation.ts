import { can, isGuardianOnly, visibleTabs, type ClubTab } from '@/lib/clubPermissions';

/**
 * Navigation model of the signed-in area (Wave 14 S1): one structure for every role, only the "Verwaltung" group varies with
 * permissions (deny-by-default). Pure so the gating is unit-tested; the sidebar only renders it.
 */

export type NavIcon = 'today' | 'club' | 'members' | 'departments' | 'profile' | 'announcements' | 'votes' | 'family' | 'calendar' | 'availability' | 'locations' | 'documents' | 'applications' | 'exits' | 'stats' | 'forms' | 'customFields' | 'absences' | 'privacy' | 'settings';

export interface NavEntry {
    id: string;
    labelKey: string;
    href: string;
    icon: NavIcon;
    /** Tab of `/verein` the entry opens (active-state matching). */
    tab?: ClubTab;
    /** Second door to a tab that another entry already marks: never shown as the active one (exactly one active entry). */
    secondary?: boolean;
}

export interface NavGroup {
    id: 'today' | 'club' | 'calendar' | 'places' | 'documents' | 'admin';
    labelKey: string;
    entries: NavEntry[];
}

export interface NavInput {
    hasClub: boolean;
    hasWards: boolean;
    /** `null` while unknown: no admin entries. */
    permissions: readonly string[] | null;
    roles: ReadonlyArray<{ roleType: string }>;
}

const verein = (id: string, labelKey: string, icon: NavIcon, tab?: ClubTab): NavEntry => ({ id, labelKey, icon, tab, href: tab && tab !== 'info' ? `/verein?tab=${tab}` : '/verein' });

export function buildNavGroups({ hasClub, hasWards, permissions, roles }: NavInput): NavGroup[] {
    // A guardian-only account (no club, at least one ward) sees nothing of a club.
    if (!hasClub) {
        return hasWards ? [{ id: 'club', labelKey: 'nav.group.club', entries: [{ id: 'family', labelKey: 'nav.familie', href: '/familie', icon: 'family' }] }] : [{ id: 'today', labelKey: 'nav.group.today', entries: [{ id: 'today', labelKey: 'nav.heute', href: '/heute', icon: 'today' }] }];
    }
    // Rights not known yet (loading / switching club): only the basics, so the sidebar does not flash entries that vanish again.
    if (permissions === null) {
        const basics: NavEntry[] = [verein('info', 'nav.verein', 'club', 'info'), verein('profile', 'nav.profile', 'profile', 'profil')];
        if (hasWards) basics.push({ id: 'family', labelKey: 'nav.familie', href: '/familie', icon: 'family' });
        return [
            { id: 'today', labelKey: 'nav.group.today', entries: [{ id: 'today', labelKey: 'nav.heute', href: '/heute', icon: 'today' }] },
            { id: 'club', labelKey: 'nav.group.club', entries: basics },
        ];
    }
    const perms = permissions;
    const tabs = visibleTabs(perms, roles);
    const clubEntries: NavEntry[] = [verein('info', 'nav.verein', 'club', 'info')];
    if (tabs.includes('mitglieder')) clubEntries.push(verein('members', 'nav.members', 'members', 'mitglieder'));
    clubEntries.push(verein('departments', 'nav.departments', 'departments', 'abteilungen'), verein('profile', 'nav.profile', 'profile', 'profil'));
    clubEntries.push({ id: 'announcements', labelKey: 'nav.mitteilungen', href: '/mitteilungen', icon: 'announcements' }, { id: 'votes', labelKey: 'nav.abstimmungen', href: '/abstimmungen', icon: 'votes' });
    if (hasWards) clubEntries.push({ id: 'family', labelKey: 'nav.familie', href: '/familie', icon: 'family' });

    const groups: NavGroup[] = [
        { id: 'today', labelKey: 'nav.group.today', entries: [{ id: 'today', labelKey: 'nav.heute', href: '/heute', icon: 'today' }] },
        { id: 'club', labelKey: 'nav.group.club', entries: clubEntries },
        { id: 'calendar', labelKey: 'nav.group.calendar', entries: [{ id: 'calendar', labelKey: 'nav.kalender', href: '/kalender', icon: 'calendar' }, { id: 'availability', labelKey: 'nav.verfuegbarkeit', href: '/verfuegbarkeit', icon: 'availability' }] },
        { id: 'places', labelKey: 'nav.group.places', entries: [{ id: 'locations', labelKey: 'nav.standorte', href: '/standorte', icon: 'locations' }] },
        { id: 'documents', labelKey: 'nav.group.documents', entries: [{ id: 'documents', labelKey: 'nav.dokumente', href: '/dokumente', icon: 'documents' }] },
    ];
    // A guardian who is also reduced inside the club keeps the club info only.
    if (isGuardianOnly(perms, roles)) return groups.filter((g) => g.id === 'today' || g.id === 'club');

    const admin: NavEntry[] = [];
    if (can(perms, 'members:write')) admin.push({ ...verein('applications', 'nav.admin.applications', 'applications', 'mitglieder'), secondary: true });
    if (tabs.includes('austritte')) admin.push(verein('exits', 'nav.admin.exits', 'exits', 'austritte'));
    if (tabs.includes('kennzahlen')) admin.push(verein('stats', 'nav.admin.stats', 'stats', 'kennzahlen'));
    if (tabs.includes('formulare')) admin.push(verein('forms', 'nav.admin.forms', 'forms', 'formulare'));
    if (tabs.includes('zusatzfelder')) admin.push(verein('customFields', 'nav.admin.customFields', 'customFields', 'zusatzfelder'));
    if (tabs.includes('fehlt')) admin.push(verein('absences', 'nav.admin.absences', 'absences', 'fehlt'));
    if (tabs.includes('datenschutz')) admin.push(verein('privacy', 'nav.admin.privacy', 'privacy', 'datenschutz'));
    if (tabs.includes('einstellungen')) admin.push(verein('settings', 'nav.admin.settings', 'settings', 'einstellungen'));
    if (admin.length > 0) groups.push({ id: 'admin', labelKey: 'nav.group.admin', entries: admin });
    return groups;
}

export interface Crumb {
    labelKey: string;
    href?: string;
}

const PAGE_LABELS: Record<string, string> = {
    '/heute': 'nav.heute',
    '/verein': 'nav.verein',
    '/mitteilungen': 'nav.mitteilungen',
    '/abstimmungen': 'nav.abstimmungen',
    '/kalender': 'nav.kalender',
    '/verfuegbarkeit': 'nav.verfuegbarkeit',
    '/standorte': 'nav.standorte',
    '/dokumente': 'nav.dokumente',
    '/familie': 'nav.familie',
    '/settings': 'nav.settings',
    '/notifications': 'nav.notifications',
};

const CLUB_TABS: readonly ClubTab[] = ['info', 'profil', 'mitglieder', 'abteilungen', 'austritte', 'kennzahlen', 'formulare', 'zusatzfelder', 'einstellungen', 'fehlt', 'datenschutz'];

/** `?tab=` as the club page reads it: an unknown value falls back to the default tab. */
export function normalizeTab(tab: string | null): ClubTab {
    return CLUB_TABS.find((t) => t === tab) ?? 'info';
}

/** Label of the page `pathname` belongs to (longest prefix, so sub-routes keep their section). */
function pageLabel(pathname: string): string | undefined {
    const key = Object.keys(PAGE_LABELS)
        .filter((k) => pathname === k || pathname.startsWith(`${k}/`))
        .sort((a, b) => b.length - a.length)[0];
    return key ? PAGE_LABELS[key] : undefined;
}

/** Home > page [> tab of the club page]. The club name is shown by the switcher next to it. */
export function breadcrumbsFor(pathname: string, tab: string | null): Crumb[] {
    if (pathname === '/heute') return [{ labelKey: 'nav.heute' }];
    const crumbs: Crumb[] = [{ labelKey: 'nav.heute', href: '/heute' }];
    const label = pageLabel(pathname);
    if (!label) return crumbs;
    if (pathname === '/verein') {
        const current = normalizeTab(tab);
        if (current !== 'info') return [...crumbs, { labelKey: label, href: '/verein' }, { labelKey: `verein.tab.${current}` }];
    }
    return [...crumbs, { labelKey: label }];
}

/** Whether `entry` is the current page. */
export function isEntryActive(entry: NavEntry, pathname: string, tab: string | null): boolean {
    const path = entry.href.split('?')[0]!;
    if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
    if (path !== '/verein') return true;
    return !entry.secondary && (entry.tab ?? 'info') === normalizeTab(tab);
}
