import { apiFetch } from './api-client';
import { backendUrl } from './auth-client';

/**
 * Notification settings (Wave 9 W4): own preferences per category and channel, and the public unsubscribe links of club
 * mails. Preferences are per account (not per club); `in_app` is always on and the mandatory classes (account security,
 * decisions about the own application/exit, invitation deadlines) cannot be switched off.
 */

export type PrefChannel = 'in_app' | 'email' | 'push';
export type PrefCategory = 'announcements' | 'events' | 'reminders';

export interface PreferenceChannel {
    channel: PrefChannel;
    enabled: boolean;
    switchable: boolean;
}

export interface PreferenceCategory {
    category: PrefCategory;
    channels: PreferenceChannel[];
}

export interface MandatoryClass {
    key: string;
    switchable: false;
}

export interface Preferences {
    categories: PreferenceCategory[];
    mandatory: MandatoryClass[];
}

export async function loadPreferences(): Promise<Preferences> {
    const res = await apiFetch<{ data: Preferences }>('/notification-preferences');
    return res.data;
}

export async function savePreference(category: PrefCategory, channel: Exclude<PrefChannel, 'in_app'>, enabled: boolean): Promise<Preferences> {
    const res = await apiFetch<{ data: Preferences }>('/notification-preferences', { method: 'PUT', body: { preferences: [{ category, channel, enabled }] } });
    return res.data;
}

/** Same state with one switch flipped (optimistic update before the server answers). */
export function withToggle(prefs: Preferences, category: PrefCategory, channel: PrefChannel, enabled: boolean): Preferences {
    return {
        ...prefs,
        categories: prefs.categories.map((c) =>
            c.category === category ? { ...c, channels: c.channels.map((ch) => (ch.channel === channel && ch.switchable ? { ...ch, enabled } : ch)) } : c,
        ),
    };
}

/* ------------------------------ public unsubscribe link ------------------------------ */

export interface UnsubscribePreview {
    category: string;
    channel: 'email';
    clubName: string | null;
    unsubscribed: boolean;
}

/**
 * Result of a call to `/unsubscribe/:token`. Deliberately coarse: the backend answers every bad token with the same 404
 * and the page must not say more than "invalid or expired" either (no hint whether a person exists).
 */
export type UnsubscribeResult<T> = { kind: 'ok'; data: T } | { kind: 'invalid' } | { kind: 'rateLimited' } | { kind: 'error' };

/** Tokens are base64url payload + "." + signature; anything else is not worth a request. */
export function isPlausibleToken(token: string | null | undefined): token is string {
    return !!token && token.length >= 20 && token.length <= 1000 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

async function callUnsubscribe<T>(token: string, method: 'GET' | 'POST', fetchImpl: typeof fetch): Promise<UnsubscribeResult<T>> {
    try {
        // No cookies and no referrer: the page is public and the token is a secret.
        const res = await fetchImpl(`${backendUrl}/unsubscribe/${encodeURIComponent(token)}`, {
            method,
            headers: { Accept: 'application/json' },
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            cache: 'no-store',
        });
        if (res.status === 429) return { kind: 'rateLimited' };
        if (res.status === 404 || res.status === 400 || res.status === 410) return { kind: 'invalid' };
        if (!res.ok) return { kind: 'error' };
        const body = (await res.json()) as { data?: T };
        return body.data ? { kind: 'ok', data: body.data } : { kind: 'error' };
    } catch {
        return { kind: 'error' };
    }
}

export const previewUnsubscribe = (token: string, fetchImpl: typeof fetch = fetch) => callUnsubscribe<UnsubscribePreview>(token, 'GET', fetchImpl);
export const confirmUnsubscribe = (token: string, fetchImpl: typeof fetch = fetch) => callUnsubscribe<{ category: string; channel: string; unsubscribed: true }>(token, 'POST', fetchImpl);
