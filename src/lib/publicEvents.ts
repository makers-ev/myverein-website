import { backendUrl } from './auth-client';
import { type FieldErrorCode, type FormDefinition, isFieldErrorCode } from './formSchema';

/**
 * Guest registration without an account (Wave 12 W7, backend `/public/events/*` and `/public/registrations/*`). No session,
 * no cookies, no referrer: the link/code/management token in the URL is the secret. The backend answers every bad token with
 * the same 404, so the pages say "invalid or expired" and nothing more. Guests never see counts or other people.
 */

export interface PublicEvent {
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string | null;
    allDay: boolean;
    cancelled: boolean;
    location: { name: string; address: string | null } | null;
    clubName: string;
    costNote: string | null;
    costCents: number | null;
}

export type PublicClosedReason = 'cancelled' | 'deadline_passed' | 'guests_not_allowed' | null;

export interface PublicRegistrationInfo {
    open: boolean;
    closedReason: PublicClosedReason;
    deadlineAt: string | null;
    maxCompanions: number;
    /** A registration would land on the waitlist. */
    full: boolean;
    form: FormDefinition | null;
}

export interface PublicEventData {
    event: PublicEvent;
    registration: PublicRegistrationInfo;
}

export interface RegisterBody {
    name: string;
    email: string;
    privacyAccepted: true;
    partySize?: number;
    answers?: Record<string, unknown>;
    language?: 'de' | 'en';
    /** Honeypot: stays empty for people. */
    website: string;
}

export interface ConfirmData {
    status: 'angemeldet' | 'warteliste';
    partySize: number;
    alreadyConfirmed: boolean;
    manageToken: string | null;
    event: PublicEvent;
}

export interface ManagedData {
    status: 'angemeldet' | 'warteliste' | 'unbestaetigt';
    partySize: number;
    name: string;
    answers: Record<string, unknown>;
    canChange: boolean;
    event: PublicEvent;
    registration: PublicRegistrationInfo;
}

export type PublicResult<T> =
    | { kind: 'ok'; data: T }
    | { kind: 'notFound' }
    | { kind: 'rateLimited' }
    | { kind: 'invalid'; fields: Record<string, FieldErrorCode>; code: string | null }
    | { kind: 'conflict'; code: string | null }
    | { kind: 'error' };

/** Tokens and codes are base64url; anything else is not worth a request. */
export function isPlausibleSecret(value: string | null | undefined): value is string {
    return !!value && value.length >= 16 && value.length <= 200 && /^[A-Za-z0-9_-]+$/.test(value);
}

export function guestLanguage(language: string): 'de' | 'en' {
    return language === 'en' ? 'en' : 'de';
}

interface ErrorBody {
    error?: { code?: string; details?: { code?: string; fields?: Record<string, unknown> } };
}

async function call<T>(path: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown, fetchImpl: typeof fetch = fetch): Promise<PublicResult<T>> {
    try {
        const res = await fetchImpl(`${backendUrl}${path}`, {
            method,
            headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            cache: 'no-store',
        });
        if (res.status === 204) return { kind: 'ok', data: undefined as T };
        if (res.status === 429) return { kind: 'rateLimited' };
        if (res.status === 404 || res.status === 410) return { kind: 'notFound' };
        if (!res.ok) {
            let parsed: ErrorBody = {};
            try {
                parsed = (await res.json()) as ErrorBody;
            } catch {
                // non-JSON error body
            }
            const code = parsed.error?.details?.code ?? null;
            if (res.status === 422) {
                const fields: Record<string, FieldErrorCode> = {};
                for (const [key, value] of Object.entries(parsed.error?.details?.fields ?? {})) fields[key] = isFieldErrorCode(value) ? value : 'invalid_value';
                return { kind: 'invalid', fields, code };
            }
            if (res.status === 409) return { kind: 'conflict', code };
            return { kind: 'error' };
        }
        const parsed = (await res.json()) as { data?: T };
        return parsed.data !== undefined ? { kind: 'ok', data: parsed.data } : { kind: 'error' };
    } catch {
        return { kind: 'error' };
    }
}

const enc = encodeURIComponent;

export const getPublicEvent = (token: string, f?: typeof fetch) => call<PublicEventData>(`/public/events/${enc(token)}`, 'GET', undefined, f);
export const registerGuest = (token: string, body: RegisterBody, f?: typeof fetch) => call<{ status: 'pending_confirmation' }>(`/public/events/${enc(token)}/registrations`, 'POST', body, f);
export const confirmGuest = (code: string, language: 'de' | 'en', f?: typeof fetch) => call<ConfirmData>('/public/registrations/confirm', 'POST', { code, language }, f);
export const getManaged = (token: string, f?: typeof fetch) => call<ManagedData>(`/public/registrations/${enc(token)}`, 'GET', undefined, f);
export const changeManaged = (token: string, body: { partySize?: number; answers?: Record<string, unknown>; name?: string }, f?: typeof fetch) =>
    call<{ status: 'angemeldet' | 'warteliste'; partySize: number }>(`/public/registrations/${enc(token)}`, 'PATCH', body, f);
export const cancelManaged = (token: string, f?: typeof fetch) => call<undefined>(`/public/registrations/${enc(token)}`, 'DELETE', undefined, f);

/** Translation key for a non-ok result of the guest pages. */
export function publicResultKey(r: Exclude<PublicResult<unknown>, { kind: 'ok' }>): string {
    switch (r.kind) {
        case 'notFound':
            return 'guest.err.notFound';
        case 'rateLimited':
            return 'guest.err.rateLimited';
        case 'conflict':
            return r.code === 'registration_closed' ? 'guest.err.closed' : r.code === 'too_many_pending' ? 'guest.err.tooManyPending' : r.code === 'party_size_unavailable' ? 'guest.err.partyUnavailable' : 'guest.err.conflict';
        case 'invalid':
            return r.code === 'companions_not_allowed' ? 'guest.err.companions' : r.code === 'party_too_large' ? 'guest.err.partyTooLarge' : r.code === 'invalid_party_size' ? 'guest.err.partySize' : 'guest.err.invalid';
        default:
            return 'guest.err.generic';
    }
}
