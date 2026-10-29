/** `GET /clubs/:clubId/search` (Wave 14): every group is present only when the caller may read it. */
export interface SearchResult {
    members?: { id: string; name: string; departmentNames?: string[] }[];
    events?: { id: string; title: string; startsAt: string }[];
    documents?: { id: string; title: string; folderId: string | null }[];
    locations?: { id: string; name: string }[];
}

export const MIN_QUERY_LENGTH = 2;

export type SearchGroupId = 'members' | 'events' | 'documents' | 'locations';

export interface SearchHit {
    id: string;
    group: SearchGroupId;
    label: string;
    /** Secondary text: departments, date, ... (already plain, formatting of dates happens in the UI). */
    detail?: string;
    startsAt?: string;
    href: string;
}

/** Flat, ordered hit list for keyboard navigation; groups the caller may not read are simply absent. */
export function flattenSearch(r: SearchResult): SearchHit[] {
    return [
        ...(r.members ?? []).map<SearchHit>((m) => ({ id: m.id, group: 'members', label: m.name, detail: m.departmentNames?.join(', '), href: '/verein?tab=mitglieder' })),
        ...(r.events ?? []).map<SearchHit>((e) => ({ id: e.id, group: 'events', label: e.title, startsAt: e.startsAt, href: '/kalender' })),
        ...(r.documents ?? []).map<SearchHit>((d) => ({ id: d.id, group: 'documents', label: d.title, href: '/dokumente' })),
        ...(r.locations ?? []).map<SearchHit>((l) => ({ id: l.id, group: 'locations', label: l.name, href: '/standorte' })),
    ];
}

export const searchPath = (clubId: string, q: string, limit = 5) => `/clubs/${encodeURIComponent(clubId)}/search?q=${encodeURIComponent(q.trim())}&limit=${limit}`;

export const isSearchable = (q: string) => q.trim().length >= MIN_QUERY_LENGTH;
