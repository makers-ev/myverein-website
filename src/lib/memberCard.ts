import { ApiError } from './api-client';
import { documentErrorKey } from './documents';

/**
 * Membership card (Wave 13 W8, backend `/club-members/:id/card`, `/member-cards/*`). The QR code holds ONE signed opaque token and
 * nothing else; validity is always decided live by the server. The website never stores the token (no localStorage); the camera
 * scan is app-only, the website verifies by pasted code or link.
 */

export type CardState = 'gueltig' | 'abgelaufen' | 'ausgetreten' | 'ungueltig' | 'nicht_ausgestellt';

export interface MemberCard {
    clubMemberId: string;
    cardId: string | null;
    issued: boolean;
    state: CardState;
    hint: 'widerrufen' | 'ruhend' | 'keine_mitgliedschaft' | null;
    validUntil: string | null;
    issuedAt: string | null;
    token: string | null;
    tokenExpiresAt: string | null;
    member: { displayName: string; memberNumber: string | null; category: string | null; initials: string };
    club: { name: string; primaryColor: string | null; accentColor: string | null; logo: { url: string } | null };
    photo: { url: string } | null;
    photoConsent: boolean;
    checkedAt: string;
}

export type VerifyResult = 'gueltig' | 'abgelaufen' | 'ausgetreten' | 'ungueltig';

export interface VerifyAnswer {
    result: VerifyResult;
    member?: { displayName: string; category: string | null; initials: string; photo: { url: string } | null };
    checkedAt: string;
}

/** Token format of the backend: `mc1.<card id>.<version>.<expiry base36>.<signature>`. */
const TOKEN_PATTERN = /mc1\.[A-Za-z0-9_-]+\.\d+\.[a-z0-9]+\.[A-Za-z0-9_-]+/;

/** Pulls the card token out of whatever was pasted: the bare code, a link that contains it, or text around it. `null` if there is none. */
export function extractCardToken(input: string): string | null {
    const text = input.trim();
    if (text === '' || text.length > 2000) return null;
    let candidate = text;
    try {
        candidate = decodeURIComponent(text);
    } catch {
        // keep the raw text
    }
    return TOKEN_PATTERN.exec(candidate)?.[0] ?? null;
}

/** Milliseconds until the token should be refreshed: one minute before it expires, never faster than every 15 s, `null` without a token. */
export function refreshDelayMs(card: Pick<MemberCard, 'token' | 'tokenExpiresAt'>, now = Date.now()): number | null {
    if (!card.token || !card.tokenExpiresAt) return null;
    const expires = Date.parse(card.tokenExpiresAt);
    if (!Number.isFinite(expires)) return null;
    return Math.max(15_000, expires - now - 60_000);
}

/** Only well-formed `#RRGGBB` values reach inline styles; anything else falls back to the theme colour. */
export function safeColor(value: string | null | undefined, fallback: string): string {
    return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

/** Readable text colour (black or white) on a `#RRGGBB` background, WCAG relative luminance. */
export function textOn(background: string): '#000000' | '#ffffff' {
    const n = parseInt(background.slice(1), 16);
    const channel = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const luminance = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
    return luminance > 0.4 ? '#000000' : '#ffffff';
}

export const CARD_STATE_TONE = { gueltig: 'success', abgelaufen: 'warning', ausgetreten: 'destructive', ungueltig: 'destructive', nicht_ausgestellt: 'muted' } as const;

/** Translation key for a failed card call. */
export function cardErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        if (err.status === 429) return 'docs.card.err.rate';
        if (err.status === 403) return 'docs.card.err.forbidden';
        if (err.status === 404) return 'docs.card.err.notFound';
    }
    if (err instanceof TypeError) return 'docs.card.verify.offline';
    return documentErrorKey(err);
}

/** Only these ids may go into the collective print (the server allows 1 to 40). */
export const PRINT_MAX = 40;
