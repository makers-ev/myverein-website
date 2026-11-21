import { backendUrl } from './auth-client';
import { type PublicResult, call } from './publicEvents';

/**
 * Public club page, club search and the board editor (Wave 15 W2/W4; backend `/public/clubs*` and `/club-public-profile*`,
 * contract B3-B5). No session, no cookies on the public calls. The backend only returns what the club released (field whitelist)
 * and answers "unknown", "not enabled", "not published" and "suspended" with the same 404, so nothing here distinguishes them.
 * Media URLs are used exactly as delivered (unsigned `public_opt_in` URLs on the public side, signed previews in the editor).
 */

export const CLUB_SLUG_FORMAT = /^[a-z0-9][a-z0-9-]{0,79}$/;
/** Search thresholds of the backend: a name of at least 3 characters or a place of at least 2. */
export const MIN_SEARCH_LENGTH = 3;
export const MIN_CITY_LENGTH = 2;

export interface PublicNamed {
    id: string;
    name: string;
}

export interface PublicEvent {
    title: string;
    startsAt: string;
    endsAt: string | null;
    allDay: boolean;
    cancelled: boolean;
    locationName: string | null;
}

export interface PublicSponsor {
    name: string;
    logoUrl: string | null;
    website: string | null;
}

/** The club's published privacy notice (a public legal text, only delivered while the inquiry form is on). */
export interface PrivacyNotice {
    version: number | string | null;
    body: string;
    publishedAt: string | null;
}

export interface PublicContact {
    email: string | null;
    phone: string | null;
    website: string | null;
}

/** Everything the club released, every part optional: a missing part is simply not shown. */
export interface PublicClub {
    slug: string;
    name: string;
    tagline: string | null;
    description: string | null;
    city: string | null;
    address: string | null;
    contact: PublicContact | null;
    logoUrl: string | null;
    coverUrl: string | null;
    galleryUrls: string[];
    departments: PublicNamed[];
    events: PublicEvent[];
    sponsors: PublicSponsor[];
    leadForm: { enabled: boolean; trialTraining: boolean; departments: PublicNamed[]; privacyNotice: PrivacyNotice | null };
    /**
     * Whether search engines may index the page. NOT a contract field: the backend does not send it, so this stays `false` (the page
     * carries `noindex`, see `src/app/v/[slug]/page.tsx`) and is only read in case the backend adds it. Open product decision:
     * does "publish" imply "may be indexed"?
     */
    indexable: boolean;
}

export type PublicClubFetch = { kind: 'ok'; club: PublicClub } | { kind: 'notFound' } | { kind: 'unavailable' };

const IP_FORMAT = /^[0-9a-fA-F:.]{2,64}$/;

/**
 * The visitor's address for the backend's per-visitor rate limit, taken ONLY from the header the operator named in
 * `PUBLIC_CLIENT_IP_HEADER` (a header a trusted reverse proxy sets or overwrites, e.g. `x-forwarded-for` or `x-real-ip`). Unset =
 * nothing is forwarded (safe default: a client-supplied header is never believed). For a comma list (`x-forwarded-for`) the entry
 * `PUBLIC_CLIENT_IP_HOPS` from the right is used (default 1 = the address the nearest trusted proxy saw); entries to the left can be forged.
 */
export function trustedClientIp(read: (name: string) => string | null, env: Record<string, string | undefined> = process.env): string | null {
    const name = env.PUBLIC_CLIENT_IP_HEADER?.trim().toLowerCase();
    if (!name) return null;
    const parts = (read(name) ?? '').split(',').map((p) => p.trim()).filter(Boolean);
    const hops = Math.max(1, Number.parseInt(env.PUBLIC_CLIENT_IP_HOPS ?? '1', 10) || 1);
    const ip = parts[parts.length - hops];
    return ip && IP_FORMAT.test(ip) ? ip : null;
}

/** Server-only headers for the backend's public rate limits (never sent from the browser). The client address only goes along with the token. */
function trustedHeaders(clientIp: string | null): Record<string, string> {
    const token = typeof window === 'undefined' ? process.env.PUBLIC_API_TRUSTED_TOKEN : undefined;
    if (!token) return {};
    return { 'X-Public-Api-Token': token, ...(clientIp && IP_FORMAT.test(clientIp) ? { 'X-Public-Client-Ip': clientIp } : {}) };
}

/**
 * Server-side read for `/v/[slug]`. NOT cached (`no-store`): a withdrawn or suspended page must answer 404 at once (the data cache would
 * keep serving the last 200). The load is carried by the backend's per-visitor limit, which is why production needs the token and the
 * client-address header (see README Configuration). Any 404 (missing, not public, suspended) is `notFound`.
 */
export async function fetchPublicClub(slug: string, clientIp: string | null = null, fetchImpl: typeof fetch = fetch): Promise<PublicClubFetch> {
    if (!CLUB_SLUG_FORMAT.test(slug) || !backendUrl) return { kind: 'notFound' };
    try {
        const res = await fetchImpl(`${backendUrl}/public/clubs/${encodeURIComponent(slug)}`, {
            headers: { Accept: 'application/json', ...trustedHeaders(clientIp) },
            credentials: 'omit',
            cache: 'no-store',
        });
        if (res.status === 404 || res.status === 410) return { kind: 'notFound' };
        if (!res.ok) return { kind: 'unavailable' };
        const body = (await res.json()) as { data?: unknown };
        const club = normalizePublicClub(body.data);
        return club ? { kind: 'ok', club } : { kind: 'unavailable' };
    } catch {
        return { kind: 'unavailable' };
    }
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/** Only `http(s)` links and images are ever used (a released website or sponsor link must not be a `javascript:` URL). */
export function safeHttpUrl(value: unknown): string | null {
    const raw = str(value);
    if (!raw) return null;
    try {
        const u = new URL(raw);
        return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
    } catch {
        return null;
    }
}

function named(v: unknown): PublicNamed[] {
    return arr(v).flatMap((x) => {
        const o = rec(x);
        const id = str(o.id);
        const name = str(o.name);
        return id && name ? [{ id, name }] : [];
    });
}

/** Defensive parse of the backend answer: unknown shape becomes `null`, unknown fields are dropped. */
export function normalizePublicClub(data: unknown): PublicClub | null {
    const d = rec(data);
    const slug = str(d.slug);
    const name = str(d.name);
    if (!slug || !name) return null;
    const contact = rec(d.contact);
    const contactOut: PublicContact = { email: str(contact.email), phone: str(contact.phone), website: safeHttpUrl(contact.website) };
    const lead = rec(d.leadForm);
    const notice = rec(lead.privacyNotice);
    const noticeBody = str(notice.body);
    return {
        slug,
        name,
        tagline: str(d.tagline),
        description: str(d.description),
        city: str(d.city),
        address: str(d.address),
        contact: contactOut.email || contactOut.phone || contactOut.website ? contactOut : null,
        logoUrl: safeHttpUrl(d.logoUrl),
        coverUrl: safeHttpUrl(d.coverUrl),
        galleryUrls: arr(d.galleryUrls).flatMap((u) => {
            const url = safeHttpUrl(u);
            return url ? [url] : [];
        }),
        departments: named(d.departments),
        events: arr(d.events).flatMap((x) => {
            const o = rec(x);
            const title = str(o.title);
            const startsAt = str(o.startsAt);
            return title && startsAt && !Number.isNaN(Date.parse(startsAt))
                ? [{ title, startsAt, endsAt: str(o.endsAt), allDay: o.allDay === true, cancelled: o.cancelled === true, locationName: str(o.locationName) }]
                : [];
        }),
        sponsors: arr(d.sponsors).flatMap((x) => {
            const o = rec(x);
            const n = str(o.name);
            return n ? [{ name: n, logoUrl: safeHttpUrl(o.logoUrl), website: safeHttpUrl(o.website) }] : [];
        }),
        leadForm: {
            enabled: lead.enabled === true,
            trialTraining: lead.trialTraining === true,
            departments: named(lead.departments),
            privacyNotice: noticeBody ? { body: noticeBody, version: typeof notice.version === 'number' || typeof notice.version === 'string' ? notice.version : null, publishedAt: str(notice.publishedAt) } : null,
        },
        indexable: d.indexable === true,
    };
}

/** Short plain-text description for `<meta>` tags (no line breaks, at most 160 characters). */
export function metaDescription(club: Pick<PublicClub, 'name' | 'tagline' | 'description' | 'city'>): string {
    const base = (club.tagline ?? club.description ?? '').replace(/\s+/g, ' ').trim();
    const text = base || (club.city ? `${club.name} in ${club.city}` : club.name);
    return text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text;
}

/** schema.org data from released fields only: no images (URLs may change), no events, no sponsors, no persons. */
export function publicClubJsonLd(club: PublicClub, pageUrl: string): Record<string, unknown> {
    const description = club.tagline ?? club.description;
    return {
        '@context': 'https://schema.org',
        '@type': 'SportsOrganization',
        name: club.name,
        url: pageUrl,
        ...(description ? { description } : {}),
        ...(club.city || club.address ? { address: { '@type': 'PostalAddress', ...(club.city ? { addressLocality: club.city } : {}), ...(club.address ? { streetAddress: club.address } : {}) } } : {}),
        ...(club.contact?.email ? { email: club.contact.email } : {}),
        ...(club.contact?.phone ? { telephone: club.contact.phone } : {}),
        ...(club.contact?.website ? { sameAs: [club.contact.website] } : {}),
    };
}

// ----- Inquiry / trial training (W2, backend B4) -----

export interface LeadBody {
    name: string;
    email: string;
    phone?: string;
    departmentId?: string;
    message?: string;
    trialRequested?: boolean;
    privacyAccepted: true;
    /** Honeypot: stays empty for people. */
    website: string;
}

/** `202` for new, duplicate and honeypot submissions alike; the page shows its own thank-you. */
export const submitLead = (slug: string, body: LeadBody, f?: typeof fetch): Promise<PublicResult<{ status: string }>> =>
    call<{ status: string }>(`/public/clubs/${encodeURIComponent(slug)}/leads`, 'POST', body, f);

// ----- Club search (W4, backend B5) -----

export interface ClubHit {
    slug: string;
    name: string;
    city: string | null;
    logoUrl: string | null;
}

/** Same thresholds as the backend: a name of 3 characters or a place of 2; whitespace does not count. */
export function isSearchable(q: string, city: string): boolean {
    return q.trim().length >= MIN_SEARCH_LENGTH || city.trim().length >= MIN_CITY_LENGTH;
}

export function normalizeClubHits(data: unknown): ClubHit[] {
    return arr(data).flatMap((x) => {
        const o = rec(x);
        const slug = str(o.slug);
        const name = str(o.name);
        return slug && name && CLUB_SLUG_FORMAT.test(slug) ? [{ slug, name, city: str(o.city), logoUrl: safeHttpUrl(o.logoUrl) }] : [];
    });
}

export type SearchResult = { kind: 'ok'; hits: ClubHit[] } | { kind: 'tooShort' } | { kind: 'rateLimited' } | { kind: 'error' };

export async function searchClubs(q: string, city: string, signal?: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<SearchResult> {
    const params = new URLSearchParams();
    if (q.trim().length >= MIN_SEARCH_LENGTH) params.set('q', q.trim());
    if (city.trim().length >= MIN_CITY_LENGTH) params.set('city', city.trim());
    if (![...params.keys()].length) return { kind: 'tooShort' };
    try {
        const res = await fetchImpl(`${backendUrl}/public/clubs?${params}`, { headers: { Accept: 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal });
        if (res.status === 429) return { kind: 'rateLimited' };
        if (res.status === 400) return { kind: 'tooShort' };
        if (!res.ok) return { kind: 'error' };
        const body = (await res.json()) as { data?: unknown };
        return { kind: 'ok', hits: normalizeClubHits(body.data) };
    } catch {
        return { kind: 'error' };
    }
}

// ----- Editor (board area, W2; backend `/club-public-profile*`, permission `public_profile:write`) -----

/** Permission that gates the editor in the UI; the backend checks it again. */
export const PUBLIC_PROFILE_PERMISSION = 'public_profile:write';
export const EDITOR_PATH = '/club-public-profile';

/** The editable draft (`ProfileIn` with values); `logoUrl`/`coverUrl`/`galleryUrls` are signed previews for the editor only. */
export interface ProfileDraft {
    tagline: string | null;
    description: string | null;
    city: string | null;
    address: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    website: string | null;
    logoKey: string | null;
    coverKey: string | null;
    galleryKeys: string[];
    departmentIds: string[];
    eventCalendarIds: string[];
    showSponsors: boolean;
    leadFormEnabled: boolean;
    trialTrainingEnabled: boolean;
    logoUrl: string | null;
    coverUrl: string | null;
    /** Signed previews, same order as `galleryKeys` (`null` = no preview available). */
    galleryUrls: (string | null)[];
}

export interface EditorData {
    publicProfileEnabled: boolean;
    discoverable: boolean;
    draft: ProfileDraft;
    /** `null` = never published (or withdrawn). */
    publishedAt: string | null;
    hasUnpublishedChanges: boolean;
    slug: string;
    publicPath: string;
}

const strs = (v: unknown): string[] => arr(v).filter((x): x is string => typeof x === 'string');

export function normalizeEditorData(data: unknown): EditorData | null {
    const d = rec(data);
    const slug = str(d.slug);
    if (!slug) return null;
    const s = rec(d.settings);
    const p = rec(d.draft);
    const published = d.published && typeof d.published === 'object' ? rec(d.published) : null;
    return {
        publicProfileEnabled: s.publicProfileEnabled === true,
        discoverable: s.discoverable === true,
        publishedAt: published ? (str(published.publishedAt) ?? '') : null,
        hasUnpublishedChanges: d.hasUnpublishedChanges === true,
        slug,
        publicPath: str(d.publicPath) ?? `/v/${slug}`,
        draft: {
            tagline: str(p.tagline),
            description: str(p.description),
            city: str(p.city),
            address: str(p.address),
            contactEmail: str(p.contactEmail),
            contactPhone: str(p.contactPhone),
            website: str(p.website),
            logoKey: str(p.logoKey),
            coverKey: str(p.coverKey),
            galleryKeys: strs(p.galleryKeys),
            departmentIds: strs(p.departmentIds),
            eventCalendarIds: strs(p.eventCalendarIds),
            showSponsors: p.showSponsors === true,
            leadFormEnabled: p.leadFormEnabled === true,
            trialTrainingEnabled: p.trialTrainingEnabled === true,
            logoUrl: safeHttpUrl(p.logoUrl),
            coverUrl: safeHttpUrl(p.coverUrl),
            galleryUrls: arr(p.galleryUrls).map((u) => safeHttpUrl(u)),
        },
    };
}

/** An editor page is live when the club switched it on and a version is published. */
export function isLive(d: Pick<EditorData, 'publicProfileEnabled' | 'publishedAt'>): boolean {
    return d.publicProfileEnabled && d.publishedAt !== null;
}

const PREVIEW_FIELDS = ['tagline', 'description', 'city', 'address', 'contactEmail', 'contactPhone', 'website', 'logoKey', 'coverKey', 'galleryKeys', 'departmentIds', 'eventCalendarIds', 'showSponsors', 'leadFormEnabled', 'trialTrainingEnabled'] as const;

/** Fields sent by `PUT /club-public-profile`: only what differs from the saved draft (editable fields only, no preview URLs). */
export function changedDraft(saved: ProfileDraft, draft: ProfileDraft): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of PREVIEW_FIELDS) {
        if (JSON.stringify(saved[key]) !== JSON.stringify(draft[key])) out[key] = draft[key];
    }
    return out;
}

/**
 * The editor preview: the page as it would look from the draft. Events and sponsors come live from the calendars and the sponsor
 * management on the real page, so the preview leaves them out (and says so).
 */
export function previewClub(draft: ProfileDraft, club: { slug: string; name: string; departments: PublicNamed[] }): PublicClub {
    const contact: PublicContact = { email: draft.contactEmail?.trim() || null, phone: draft.contactPhone?.trim() || null, website: safeHttpUrl(draft.website) };
    const shown = club.departments.filter((d) => draft.departmentIds.includes(d.id));
    return {
        slug: club.slug,
        name: club.name,
        tagline: draft.tagline?.trim() || null,
        description: draft.description?.trim() || null,
        city: draft.city?.trim() || null,
        address: draft.address?.trim() || null,
        contact: contact.email || contact.phone || contact.website ? contact : null,
        logoUrl: draft.logoUrl,
        coverUrl: draft.coverUrl,
        galleryUrls: draft.galleryUrls.filter((u): u is string => u !== null),
        departments: shown,
        events: [],
        sponsors: [],
        leadForm: { enabled: draft.leadFormEnabled, trialTraining: draft.leadFormEnabled && draft.trialTrainingEnabled, departments: shown, privacyNotice: null },
        indexable: false,
    };
}

// ----- Editor image upload (backend `POST /club-public-profile/images`: PNG/JPEG/WebP, <= 5 MB, at most 6 gallery images) -----

export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MAX_GALLERY_IMAGES = 6;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Client pre-check before an upload (translation key of the problem, or `null`); the backend checks again (magic bytes, size). */
export function imageProblem(file: Pick<File, 'type' | 'size'>): string | null {
    if (!IMAGE_TYPES.includes(file.type)) return 'media.err.type';
    if (file.size > PROFILE_IMAGE_MAX_BYTES) return 'pcEditor.image.tooLarge';
    return null;
}
