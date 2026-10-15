/**
 * Single source of truth for what the marketing page may claim. Flipping `status` from 'soon' to 'live' (and adding the
 * `featureRef`) is all it takes to turn a dashed sketch into solid ink everywhere. `featureRef` points at the ids in the
 * vault's Feature List; `wave` at the implementation wave that delivers a planned item.
 * Copy lives in MarketingTranslation.ts under `${i18nKey}.title` and `${i18nKey}.body`.
 */
export type Status = 'live' | 'soon';

export type ItemGroup =
    | 'members'
    | 'events'
    | 'meetings'
    | 'material'
    | 'places'
    | 'rights'
    | 'club'
    | 'communication'
    | 'consent'
    | 'voting'
    | 'planning'
    | 'documents'
    | 'forms'
    | 'public';

export type MarketingItem = {
    id: string;
    status: Status;
    group: ItemGroup;
    /** Feature List ids; required for live items. */
    featureRef?: string[];
    /** Implementation wave; required for planned items. */
    wave?: number;
    /** Short icon key the consuming component maps to a glyph. */
    icon?: string;
    /** `mk.item.<id>`; the copy is `${i18nKey}.title` / `${i18nKey}.body`. */
    i18nKey: string;
};

type ItemInput = Omit<MarketingItem, 'i18nKey'>;

const defineItems = (items: ItemInput[]): MarketingItem[] =>
    items.map((item) => ({ ...item, i18nKey: `mk.item.${item.id}` }));

export const marketingItems: MarketingItem[] = defineItems([
    // ---- live ----
    { id: 'members-no-account', status: 'live', group: 'members', featureRef: ['11.1', '11.2'], icon: 'people' },
    { id: 'member-search', status: 'live', group: 'members', featureRef: ['11.4'], icon: 'search' },
    { id: 'member-number', status: 'live', group: 'members', featureRef: ['9.3', '11.5'], icon: 'number' },
    { id: 'application', status: 'live', group: 'members', featureRef: ['1.4', '9.1', '9.2'], icon: 'form' },
    { id: 'account-invite', status: 'live', group: 'members', featureRef: ['11.9', '11.22'], icon: 'mail' },
    { id: 'status-lifecycle', status: 'live', group: 'members', featureRef: ['11.6'], icon: 'cycle' },
    { id: 'categories', status: 'live', group: 'members', featureRef: ['11.7'], icon: 'tag' },
    { id: 'departments', status: 'live', group: 'members', featureRef: ['1.7', '11.8'], icon: 'branches' },
    { id: 'exit-checklist', status: 'live', group: 'members', featureRef: ['11.10', '11.24', '11.25'], icon: 'door' },
    { id: 'calendar', status: 'live', group: 'events', featureRef: ['3.1', '3.2', '3.3', '3.4'], icon: 'calendar' },
    { id: 'ical', status: 'live', group: 'events', featureRef: ['3.5'], icon: 'sync' },
    { id: 'scheduling-poll', status: 'live', group: 'events', featureRef: ['3.7', '4.1'], icon: 'poll' },
    { id: 'meetings', status: 'live', group: 'meetings', featureRef: ['3.6', '3.9', '3.10', '11.39', '11.49'], icon: 'gavel' },
    { id: 'material-lending', status: 'live', group: 'material', featureRef: ['5.3', '11.27'], icon: 'box' },
    { id: 'damage-report', status: 'live', group: 'material', featureRef: ['5.5', '11.51'], icon: 'camera' },
    { id: 'places', status: 'live', group: 'places', featureRef: ['6.1', '11.37'], icon: 'pin' },
    { id: 'wifi-qr', status: 'live', group: 'places', featureRef: ['6.4', '11.46'], icon: 'wifi' },
    { id: 'keys', status: 'live', group: 'places', featureRef: ['6.7', '11.45'], icon: 'key' },
    { id: 'club-stats', status: 'live', group: 'club', featureRef: ['11.17'], icon: 'chart' },
    { id: 'csv-import-export', status: 'live', group: 'club', featureRef: ['11.34', '11.35', '11.43', '11.44'], icon: 'sheet' },
    { id: 'rights-deny-default', status: 'live', group: 'rights', featureRef: ['11.12', '11.13', '11.14'], icon: 'lock' },
    { id: 'profile-photo-minors', status: 'live', group: 'rights', featureRef: ['11.28', '11.29'], icon: 'portrait' },
    { id: 'signed-links', status: 'live', group: 'rights', featureRef: ['11.32'], icon: 'link' },
    { id: 'sensitive-audit', status: 'live', group: 'rights', featureRef: ['11.33'], icon: 'log' },
    { id: 'found-club', status: 'live', group: 'club', featureRef: ['10.1'], icon: 'flag' },
    { id: 'club-switcher', status: 'live', group: 'club', featureRef: ['2.5', '11.19'], icon: 'switch' },
    // ---- planned (gap analysis / waves) ----
    { id: 'bulletin-board', status: 'soon', group: 'communication', wave: 9, icon: 'pin-board' },
    { id: 'broadcast', status: 'soon', group: 'communication', wave: 9, icon: 'megaphone' },
    { id: 'reminders', status: 'soon', group: 'communication', wave: 9, icon: 'bell' },
    { id: 'consents', status: 'soon', group: 'consent', wave: 10, icon: 'check' },
    { id: 'data-requests', status: 'soon', group: 'consent', wave: 10, icon: 'folder' },
    { id: 'parent-access', status: 'soon', group: 'consent', wave: 10, icon: 'family' },
    { id: 'sick-notice', status: 'soon', group: 'consent', wave: 10, icon: 'thermometer' },
    { id: 'voting', status: 'soon', group: 'voting', wave: 11, icon: 'ballot' },
    { id: 'circular-resolution', status: 'soon', group: 'voting', wave: 11, icon: 'loop' },
    { id: 'elections', status: 'soon', group: 'voting', wave: 11, icon: 'ballot' },
    { id: 'invitation-deadline', status: 'soon', group: 'voting', wave: 11, icon: 'hourglass' },
    { id: 'recurring-events', status: 'soon', group: 'planning', wave: 12, icon: 'repeat' },
    { id: 'training-attendance', status: 'soon', group: 'planning', wave: 12, icon: 'clipboard' },
    { id: 'shift-planning', status: 'soon', group: 'planning', wave: 12, icon: 'hands' },
    { id: 'event-signup', status: 'soon', group: 'planning', wave: 12, icon: 'ticket' },
    { id: 'member-card', status: 'soon', group: 'documents', wave: 13, icon: 'card' },
    { id: 'documents-read', status: 'soon', group: 'documents', wave: 13, icon: 'book' },
    { id: 'pdf-receipts', status: 'soon', group: 'documents', wave: 13, icon: 'pdf' },
    { id: 'custom-forms', status: 'soon', group: 'forms', wave: 8, icon: 'form' },
    { id: 'sponsor-profiles', status: 'soon', group: 'public', wave: 15, icon: 'handshake' },
    { id: 'public-page', status: 'soon', group: 'public', wave: 15, icon: 'globe' },
]);

/** Billing is out of scope by design; shown as a friendly boundary, never as a planned feature. */
export const outOfScopeItems: { id: string; i18nKey: string }[] = ['billing-sepa', 'billing-dunning', 'billing-cashbook', 'billing-receipts'].map(
    (id) => ({ id, i18nKey: `mk.item.${id}` }),
);

export const liveItems: MarketingItem[] = marketingItems.filter((item) => item.status === 'live');
export const soonItems: MarketingItem[] = marketingItems.filter((item) => item.status === 'soon');

const itemsById = new Map(marketingItems.map((item) => [item.id, item]));

/** Looks an item up by id; throws on a typo so a wrong id fails loudly in dev and tests instead of rendering nothing. */
export function getItem(id: string): MarketingItem {
    const item = itemsById.get(id);
    if (!item) throw new Error(`Unknown marketing item: ${id}`);
    return item;
}

export function itemsByGroup(group: ItemGroup): MarketingItem[] {
    return marketingItems.filter((item) => item.group === group);
}

export type Role = 'mitglied' | 'vorstand' | 'abteilungsleitung' | 'eltern' | 'ohne-konto';

export const roles: Role[] = ['mitglied', 'vorstand', 'abteilungsleitung', 'eltern', 'ohne-konto'];

/** Item that gates a role; the role is only "live" once that feature is. Roles without an entry exist today. */
const roleGate: Partial<Record<Role, string>> = { eltern: 'parent-access' };

export function roleStatus(role: Role): Status {
    const gate = roleGate[role];
    return gate ? getItem(gate).status : 'live';
}

export function roleWave(role: Role): number | undefined {
    const gate = roleGate[role];
    return gate ? getItem(gate).wave : undefined;
}

/** Ids the marketing components build dynamic i18n keys from; the test checks every key exists in DE and EN. */
export const weekDayIds = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'] as const;
export const heroWordCount = 7;
export const heroToolIds = ['excel', 'whatsapp', 'doodle', 'zettel', 'anwesenheit'] as const;
export const heroCardLineCount = 4;
export const rolePointCount = 4;
export const clubIds = ['sport', 'chor', 'feuerwehr', 'schach', 'tanz', 'schuetzen', 'kleingarten', 'musik'] as const;
export const clubListKeys = ['cat', 'dep', 'rol'] as const;
export const roadmapGroups = ['communication', 'consent', 'voting', 'planning', 'documents', 'forms', 'public'] as const;
export const quizToolIds = ['excel', 'whatsapp', 'doodle', 'attendance', 'notes'] as const;
