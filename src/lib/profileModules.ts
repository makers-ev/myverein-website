import type { CustomFieldType, EditableBy, VisibleTo } from './customFields';
import type { FieldOption } from './formEditor';

/**
 * Pure helpers of the profile module catalog ("Profil-Bausteine", `GET /member-fields/catalog`, `forms:write`): optional,
 * ready-made custom fields the board switches on per club with one click. Nothing here is mandatory for members and the
 * catalog is code on the server, so this file only groups, labels and decides what can be clicked; the server stays the
 * authority (limit, `members:read_sensitive` for Kinderschutz modules).
 */

export type ModuleState = 'active' | 'archived' | 'inactive';

export interface CatalogGroup {
    id: string;
    label: string;
}

export interface CatalogModule {
    id: string;
    group: string;
    label: string;
    description: string;
    helpText: string | null;
    type: CustomFieldType;
    options: FieldOption[] | null;
    validation: { maxLength?: number; min?: number; max?: number } | null;
    visibleTo: VisibleTo;
    editableBy: EditableBy;
    sensitive: boolean;
    mandatory: false;
    neverMandatoryGroup: boolean;
    state: ModuleState;
    fieldId: string | null;
    /** The board changed the definition after activation (label, options, visibility, ...). */
    customized: boolean;
}

export interface Catalog {
    groups: CatalogGroup[];
    modules: CatalogModule[];
    limit: { used: number; max: number };
}

const KNOWN_GROUPS = new Set(['fuehrerschein', 'qualifikationen', 'kinderschutz', 'mitarbeit', 'sport', 'persoenlich']);

/** Translation key of a known group, `null` for a group this client does not know (the server's label is shown then). */
export const groupLabelKey = (id: string): string | null => (KNOWN_GROUPS.has(id) ? `forms.mod.group.${id}` : null);

export interface ModuleGroupView {
    group: CatalogGroup;
    modules: CatalogModule[];
}

/** Modules per group in the server's group order; empty groups are left out, modules of an unknown group follow at the end under their own id. */
export function groupModules(catalog: Pick<Catalog, 'groups' | 'modules'>): ModuleGroupView[] {
    const known = new Set(catalog.groups.map((g) => g.id));
    const views: ModuleGroupView[] = catalog.groups.map((group) => ({ group, modules: catalog.modules.filter((m) => m.group === group.id) }));
    const strays = [...new Set(catalog.modules.filter((m) => !known.has(m.group)).map((m) => m.group))];
    for (const id of strays) views.push({ group: { id, label: id }, modules: catalog.modules.filter((m) => m.group === id) });
    return views.filter((v) => v.modules.length > 0);
}

export interface Audience {
    /** `forms.mod.aud.*`: plain-German statement of who sees the values. */
    key: string;
    /** Additional "vertraulich" marker when the audience text does not already say so. */
    confidential: boolean;
}

/** "Sichtbar für Vorstand, Trainer, Abteilungsleitung" / "Nur Vorstand, vertraulich" / ... */
export function moduleAudience(m: Pick<CatalogModule, 'visibleTo' | 'sensitive'>): Audience {
    if (m.visibleTo === 'vorstand') return { key: m.sensitive ? 'forms.mod.aud.vorstandConfidential' : 'forms.mod.aud.vorstand', confidential: false };
    return { key: m.visibleTo === 'mitglied' ? 'forms.mod.aud.mitglied' : 'forms.mod.aud.funktionstraeger', confidential: m.sensitive };
}

export interface LimitView {
    used: number;
    max: number;
    remaining: number;
    full: boolean;
    /** Ten or fewer left: the meter turns into a warning. */
    nearly: boolean;
    percent: number;
}

export function limitView(limit: { used: number; max: number }): LimitView {
    const remaining = Math.max(0, limit.max - limit.used);
    return { used: limit.used, max: limit.max, remaining, full: remaining === 0, nearly: remaining <= 10, percent: limit.max > 0 ? Math.min(100, Math.round((limit.used / limit.max) * 100)) : 100 };
}

export type ToggleBlock = 'limit' | 'sensitive';

/**
 * Why a module cannot be switched on/off right now (`null` = it can). A new module needs a free slot (re-activating an archived
 * one does not); Kinderschutz modules (sensitive) are switched only by people with `members:read_sensitive`.
 */
export function toggleBlock(m: Pick<CatalogModule, 'state' | 'sensitive'>, limit: { used: number; max: number }, canReadSensitive: boolean): ToggleBlock | null {
    if (m.sensitive && !canReadSensitive) return 'sensitive';
    if (m.state === 'inactive' && limitView(limit).full) return 'limit';
    return null;
}

/** Modules that carry their own privacy statement (the Führungszeugnis records only existence and dates, never the content). */
export const PRIVACY_NOTE_MODULES: Readonly<Record<string, string>> = { mod_ks_fuehrungszeugnis: 'forms.mod.privacy.fuehrungszeugnis' };

export const activeCount = (modules: readonly Pick<CatalogModule, 'state'>[]): number => modules.filter((m) => m.state === 'active').length;

/** Well-formed catalog or `null` (an unexpected answer is an error state, not a half-rendered list). */
export function asCatalog(value: unknown): Catalog | null {
    const v = (value as { data?: unknown } | null)?.data as Partial<Catalog> | undefined;
    if (!v || !Array.isArray(v.groups) || !Array.isArray(v.modules) || typeof v.limit?.used !== 'number' || typeof v.limit.max !== 'number') return null;
    return v as Catalog;
}
