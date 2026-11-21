import { ApiError } from './api-client';
import { memberErrorKey } from './clubMembers';
import { mediaErrorKey } from './mediaUpload';

/**
 * Sponsors and partners of the club (Wave 15 W1, backend README "Sponsors and partners"). Pure helpers live here so the
 * form-to-payload mapping, the "runs out soon" overview and the error wording are unit-tested; the components only render.
 * No amounts, no invoices: billing is outside MyVerein, the consideration is free text.
 */

export const SPONSOR_STATUSES = ['geplant', 'aktiv', 'abgelaufen'] as const;
export type SponsorStatus = (typeof SPONSOR_STATUSES)[number];
export const SPONSOR_VISIBILITIES = ['intern', 'oeffentlich'] as const;
export type SponsorVisibility = (typeof SPONSOR_VISIBILITIES)[number];

/** Filter of the list: a status, "runs out soon" (backend `laeuft_aus`) or everything. */
export type SponsorFilter = 'all' | SponsorStatus | 'laeuft_aus';
export const SPONSOR_FILTERS: readonly SponsorFilter[] = ['all', 'laeuft_aus', 'aktiv', 'geplant', 'abgelaufen'];

export const SPONSOR_LIMITS = { name: 120, website: 300, description: 2000, consideration: 1000, notes: 2000, role: 80, contactName: 120, phone: 40, email: 320, contacts: 10 } as const;

/** Logo limits of `PUT /sponsors/:id/logo` (backend `MAX_LOGO_BYTES`, PNG/JPEG/WebP). */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export interface SponsorContact {
    id: string;
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    isPrimary: boolean;
}

export interface Sponsor {
    id: string;
    name: string;
    website: string | null;
    description: string | null;
    consideration: string | null;
    startsOn: string | null;
    endsOn: string | null;
    visibility: SponsorVisibility;
    notes: string | null;
    status: SponsorStatus;
    expiringSoon: boolean;
    daysLeft: number | null;
    /** Short-lived signed URL from the media layer (never a stored link); `null` without a logo. */
    logoUrl: string | null;
    contacts: SponsorContact[];
    linkedAccount: { memberId: string; name: string } | null;
}

/** Editable contact row of the form; `id` is set for stored contacts. */
export interface ContactDraft {
    id?: string;
    name: string;
    role: string;
    email: string;
    phone: string;
    isPrimary: boolean;
}

export interface SponsorForm {
    name: string;
    website: string;
    description: string;
    consideration: string;
    startsOn: string;
    endsOn: string;
    visibility: SponsorVisibility;
    notes: string;
    contacts: ContactDraft[];
}

export const emptyContact = (): ContactDraft => ({ name: '', role: '', email: '', phone: '', isPrimary: false });

export function emptyForm(): SponsorForm {
    return { name: '', website: '', description: '', consideration: '', startsOn: '', endsOn: '', visibility: 'intern', notes: '', contacts: [] };
}

export function formFromSponsor(s: Sponsor): SponsorForm {
    return {
        name: s.name,
        website: s.website ?? '',
        description: s.description ?? '',
        consideration: s.consideration ?? '',
        startsOn: s.startsOn ?? '',
        endsOn: s.endsOn ?? '',
        visibility: s.visibility,
        notes: s.notes ?? '',
        contacts: s.contacts.map((c) => ({ id: c.id, name: c.name, role: c.role ?? '', email: c.email ?? '', phone: c.phone ?? '', isPrimary: c.isPrimary })),
    };
}

/** Marks exactly one contact as the primary one (the backend keeps a single primary contact). */
export function setPrimary(contacts: readonly ContactDraft[], index: number): ContactDraft[] {
    return contacts.map((c, i) => ({ ...c, isPrimary: i === index }));
}

/** Contacts the board actually filled in: a row without a name is dropped. */
export function filledContacts(contacts: readonly ContactDraft[]): ContactDraft[] {
    return contacts.filter((c) => c.name.trim() !== '');
}

const blankToNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());

/** Fields of `POST`/`PATCH /sponsors` (empty text clears a field with `null`). */
export function sponsorFields(f: SponsorForm) {
    return {
        name: f.name.trim(),
        website: blankToNull(f.website),
        description: blankToNull(f.description),
        consideration: blankToNull(f.consideration),
        startsOn: f.startsOn || null,
        endsOn: f.endsOn || null,
        visibility: f.visibility,
        notes: blankToNull(f.notes),
    };
}

/** Body of `POST /sponsors`: the fields plus the filled contacts (at most one primary; the first one when none is marked). */
export function createPayload(f: SponsorForm) {
    const contacts = filledContacts(f.contacts);
    const primary = contacts.some((c) => c.isPrimary) ? contacts.findIndex((c) => c.isPrimary) : contacts.length > 0 ? 0 : -1;
    return {
        ...sponsorFields(f),
        contacts: contacts.map((c, i) => ({ name: c.name.trim(), role: blankToNull(c.role), email: blankToNull(c.email), phone: blankToNull(c.phone), isPrimary: i === primary })),
    };
}

/** Body of a contact request (`POST`/`PATCH /sponsors/:id/contacts`). */
export function contactPayload(c: ContactDraft) {
    return { name: c.name.trim(), role: blankToNull(c.role), email: blankToNull(c.email), phone: blankToNull(c.phone), isPrimary: c.isPrimary };
}

/** Only what differs from the stored sponsor (a `PATCH` must not be empty). */
export function sponsorPatch(original: SponsorForm, next: SponsorForm): Record<string, unknown> {
    const a = sponsorFields(original);
    const b = sponsorFields(next);
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(b) as (keyof typeof b)[]) if (a[key] !== b[key]) patch[key] = b[key];
    return patch;
}

const sameContact = (a: ContactDraft, b: ContactDraft) => a.name.trim() === b.name.trim() && blankToNull(a.role) === blankToNull(b.role) && blankToNull(a.email) === blankToNull(b.email) && blankToNull(a.phone) === blankToNull(b.phone) && a.isPrimary === b.isPrimary;

export interface ContactChanges {
    create: ContactDraft[];
    update: ContactDraft[];
    remove: string[];
}

/** Which contact requests an edit needs: new rows, changed stored rows, stored rows that were removed or emptied. */
export function contactChanges(original: readonly ContactDraft[], next: readonly ContactDraft[]): ContactChanges {
    const kept = next.filter((c) => c.name.trim() !== '');
    const keptIds = new Set(kept.map((c) => c.id).filter(Boolean));
    const before = new Map(original.map((c) => [c.id, c]));
    return {
        create: kept.filter((c) => !c.id),
        update: kept.filter((c) => c.id && before.has(c.id) && !sameContact(before.get(c.id)!, c)),
        remove: original.map((c) => c.id).filter((id): id is string => !!id && !keptIds.has(id)),
    };
}

/** Whether the input is an http(s) link, like the backend demands (never `javascript:` or a file). */
export function isHttpLink(value: string): boolean {
    return /^https?:\/\/[^\s<>"]+$/i.test(value.trim());
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Translation key of the first problem of the form, or `null`. */
export function formProblem(f: SponsorForm): string | null {
    if (f.name.trim() === '') return 'sponsors.err.name';
    if (f.website.trim() !== '' && !isHttpLink(f.website)) return 'sponsors.err.website';
    if (f.startsOn && f.endsOn && f.endsOn < f.startsOn) return 'sponsors.err.period';
    if (f.contacts.filter((c) => c.name.trim() !== '').length > SPONSOR_LIMITS.contacts) return 'sponsors.err.contactLimit';
    if (f.contacts.some((c) => c.name.trim() !== '' && c.email.trim() !== '' && !EMAIL.test(c.email.trim()))) return 'sponsors.err.email';
    return null;
}

/** Translation key if the chosen logo file cannot be uploaded (size and type, checked before the request). */
export function logoProblem(file: { size: number; type: string }): string | null {
    if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return 'sponsors.logo.err.type';
    if (file.size > LOGO_MAX_BYTES) return 'sponsors.logo.err.size';
    return null;
}

/** Sponsors that run out within the backend window (`expiringSoon`), soonest first: the "runs out soon" overview. */
export function expiringSponsors(list: readonly Sponsor[]): Sponsor[] {
    return list.filter((s) => s.expiringSoon && s.status === 'aktiv').sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity) || a.name.localeCompare(b.name));
}

/** Applies the list filter client-side (the list is loaded once, the filters never refetch). */
export function filterSponsors(list: readonly Sponsor[], filter: SponsorFilter, query: string): Sponsor[] {
    const q = query.trim().toLowerCase();
    return list.filter((s) => {
        if (q && !s.name.toLowerCase().includes(q)) return false;
        if (filter === 'all') return true;
        if (filter === 'laeuft_aus') return s.expiringSoon && s.status === 'aktiv';
        return s.status === filter;
    });
}

/** Counts per filter chip. */
export function filterCounts(list: readonly Sponsor[]): Record<SponsorFilter, number> {
    return { all: list.length, laeuft_aus: filterSponsors(list, 'laeuft_aus', '').length, aktiv: filterSponsors(list, 'aktiv', '').length, geplant: filterSponsors(list, 'geplant', '').length, abgelaufen: filterSponsors(list, 'abgelaufen', '').length };
}

/** Plain-language key for a failed sponsor request. */
export function sponsorErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        const code = (err.details as { code?: unknown } | undefined)?.code;
        if (code === 'invalid_period') return 'sponsors.err.period';
        if (code === 'contact_limit') return 'sponsors.err.contactLimit';
        if (err.status === 422 && /http\(s\) link/i.test(JSON.stringify(err.details ?? ''))) return 'sponsors.err.website';
    }
    return memberErrorKey(err);
}

/** Same for the logo upload (quota, size, type, rate limit). */
export function logoErrorKey(err: unknown): string {
    return mediaErrorKey(err);
}

/** Uploads the logo as multipart `file`; the response carries the sponsor with a fresh signed URL. */
export function logoFormData(file: Blob, filename: string): FormData {
    const body = new FormData();
    body.append('file', file, filename);
    return body;
}
