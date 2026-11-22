import type { ClubHit } from './publicClub';
import { MIN_CITY_LENGTH, MIN_SEARCH_LENGTH, isSearchable } from './publicClub';

/**
 * Logic of the public club search page `/vereinssuche`: the shareable URL (`?q=<name>&ort=<place>`), the per-field "how many more
 * characters" hints and the view state. The request itself is `searchClubs` in `publicClub.ts` (backend `GET /public/clubs`).
 */

/** Same cap as the inputs (`maxLength`) and a sane upper bound for a hand-edited URL. */
export const MAX_FIELD_LENGTH = 80;
/** The backend returns at most this many hits; reaching it means "there may be more, narrow it down". */
export const MAX_HITS = 10;

export interface SearchQuery {
    q: string;
    city: string;
}

export const EMPTY_QUERY: SearchQuery = { q: '', city: '' };

/** What the results area shows. `rateLimited` is an error with its own wording (HTTP 429). */
export type SearchViewState =
    | { kind: 'idle' }
    | { kind: 'tooShort' }
    | { kind: 'loading' }
    | { kind: 'ok'; hits: ClubHit[] }
    | { kind: 'error'; rateLimited: boolean };

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

function clean(value: string | null | undefined): string {
    return (value ?? '').replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_FIELD_LENGTH);
}

/** Reads `q` and `ort` from the URL; anything else is ignored, values are trimmed, collapsed and capped. */
export function parseQuery(params: { get(name: string): string | null }): SearchQuery {
    return { q: clean(params.get('q')), city: clean(params.get('ort')) };
}

/** `''` or `?q=...&ort=...` with only the non-empty parts; round-trips with `parseQuery`. */
export function queryToSearch(query: SearchQuery): string {
    const params = new URLSearchParams();
    const q = clean(query.q);
    const city = clean(query.city);
    if (q) params.set('q', q);
    if (city) params.set('ort', city);
    const s = params.toString();
    return s ? `?${s}` : '';
}

/** Equal after cleaning (so "Verein " and "Verein" do not trigger a second search or a history entry). */
export function sameQuery(a: SearchQuery, b: SearchQuery): boolean {
    return clean(a.q) === clean(b.q) && clean(a.city) === clean(b.city);
}

/** `0` for an empty field or one that is long enough, otherwise the number of characters still missing. */
export function missingChars(value: string, min: number): number {
    const len = value.trim().length;
    return len === 0 || len >= min ? 0 : min - len;
}

export const missingNameChars = (q: string): number => missingChars(q, MIN_SEARCH_LENGTH);
export const missingCityChars = (city: string): number => missingChars(city, MIN_CITY_LENGTH);

/** The state to show while no request is running or finished: nothing typed = `idle`, typed but too short = `tooShort`. */
export function quietState(query: SearchQuery): SearchViewState {
    if (isSearchable(query.q, query.city)) return { kind: 'loading' };
    return query.q.trim() || query.city.trim() ? { kind: 'tooShort' } : { kind: 'idle' };
}

/** One or two capital letters for the logo fallback ("TSV Beispiel" -> "TB", "Turnverein" -> "T"). */
export function initials(name: string): string {
    const words = name.split(/[\s\-_/]+/).filter((w) => /\p{L}|\p{N}/u.test(w));
    const letters = words.slice(0, 2).map((w) => ([...w].find((c) => /\p{L}|\p{N}/u.test(c)) ?? '').toUpperCase());
    return letters.join('') || '?';
}
