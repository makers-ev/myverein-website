import type { FieldErrorCode } from './formSchema';

/**
 * Pure helpers of the `credential` custom field type (profile modules / "Profil-Bausteine", backend `src/lib/credentials.ts`
 * and `cleanCredential` in `src/lib/form-schema.ts`): a qualification a person holds, optionally with a level, the date it
 * was obtained and a validity end (`validUntil`). Value: `{ valid: true, level?, obtainedOn?, validUntil? }`; "not held" is
 * no value at all (the field is cleared with `null`). Everything here mirrors the server for convenience (live preview, local
 * validation, labels); the server stays the authority for values and for the expiry status of saved values. There are no
 * reminders -- the status is shown, nothing is sent (Wave 9).
 */

export type CredentialStatus = 'expired' | 'expiring' | 'valid' | 'missing';
export const CREDENTIAL_STATUSES: readonly CredentialStatus[] = ['expired', 'expiring', 'valid', 'missing'];
export const DEFAULT_EXPIRING_DAYS = 90;
export const EXPIRING_WINDOWS = [30, 90, 180] as const;

/** `expiry` of a credential field as the member views and the overview send it. */
export interface CredentialExpiry {
    status: CredentialStatus;
    /** Days from today (Berlin) to `validUntil`; negative once expired; `null` without a value or without `validUntil`. */
    daysLeft: number | null;
    validUntil: string | null;
}

export interface CredentialValue {
    valid: true;
    level?: string;
    obtainedOn?: string;
    validUntil?: string;
}

export const MIN_CREDENTIAL_DATE = '1900-01-01';
export const MAX_CREDENTIAL_DATE = '2100-12-31';
/** Hard limit of a free-text level (the definition's `validation.maxLength` can only lower it). */
export const MAX_LEVEL_LENGTH = 200;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export const isCredentialStatus = (v: unknown): v is CredentialStatus => typeof v === 'string' && (CREDENTIAL_STATUSES as readonly string[]).includes(v);

/** `YYYY-MM-DD` that names a real day between 1900-01-01 and 2100-12-31 (same range as the server). */
export function isCredentialDate(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value && value >= MIN_CREDENTIAL_DATE && value <= MAX_CREDENTIAL_DATE;
}

/** How the level of a credential is entered: a choice from the definition's options, free text limited by `validation.maxLength`, or not at all. */
export type LevelMode = 'select' | 'text' | 'none';

export function levelMode(field: { options?: ReadonlyArray<unknown> | null; validation?: { maxLength?: number } | null }): LevelMode {
    if (field.options && field.options.length > 0) return 'select';
    if (typeof field.validation?.maxLength === 'number') return 'text';
    return 'none';
}

export const levelMaxLength = (field: { validation?: { maxLength?: number } | null }): number => Math.min(field.validation?.maxLength ?? MAX_LEVEL_LENGTH, MAX_LEVEL_LENGTH);

/** Draft of the three inputs behind "habe ich"; empty strings mean "not given". */
export interface CredentialDraft {
    level: string;
    obtainedOn: string;
    validUntil: string;
}

/** The stored credential as a record, or `null` for anything that is not an object with `valid: true`. */
export function asCredential(value: unknown): CredentialValue | null {
    if (!isRecord(value) || value.valid !== true) return null;
    const out: CredentialValue = { valid: true };
    if (typeof value.level === 'string' && value.level !== '') out.level = value.level;
    if (typeof value.obtainedOn === 'string' && value.obtainedOn !== '') out.obtainedOn = value.obtainedOn;
    if (typeof value.validUntil === 'string' && value.validUntil !== '') out.validUntil = value.validUntil;
    return out;
}

export function credentialDraft(value: unknown): CredentialDraft {
    const c = asCredential(value);
    return { level: c?.level ?? '', obtainedOn: c?.obtainedOn ?? '', validUntil: c?.validUntil ?? '' };
}

/** The value to send for "habe ich" plus the draft: only given parts, level trimmed, empty strings dropped (same shape as the server stores). */
export function buildCredential(draft: Partial<CredentialDraft>): CredentialValue {
    const out: CredentialValue = { valid: true };
    const level = (draft.level ?? '').trim();
    if (level !== '') out.level = level;
    if ((draft.obtainedOn ?? '') !== '') out.obtainedOn = draft.obtainedOn;
    if ((draft.validUntil ?? '') !== '') out.validUntil = draft.validUntil;
    return out;
}

/** "Gültig bis" lies before "erworben am" (the server answers `invalid_value`); false while one of them is missing or malformed. */
export function datesOutOfOrder(value: unknown): boolean {
    const c = asCredential(value);
    return !!c?.obtainedOn && !!c.validUntil && isCredentialDate(c.obtainedOn) && isCredentialDate(c.validUntil) && c.validUntil < c.obtainedOn;
}

const ALLOWED_KEYS = new Set(['valid', 'level', 'obtainedOn', 'validUntil']);

/**
 * Local mirror of the server's credential check (`cleanCredential`); returns the field error code the server would answer
 * (`invalid_type`, `invalid_value`, `not_an_option`, `too_long`) or `null`.
 */
export function credentialProblem(
    field: { options?: ReadonlyArray<{ value: string }> | null; validation?: { maxLength?: number } | null },
    value: unknown,
    isClean: (text: string) => boolean = () => true,
): FieldErrorCode | null {
    if (!isRecord(value)) return 'invalid_type';
    if (Object.keys(value).some((k) => !ALLOWED_KEYS.has(k))) return 'invalid_value';
    if (value.valid !== true) return 'invalid_value';
    if (value.level !== undefined) {
        if (typeof value.level !== 'string') return 'invalid_type';
        const mode = levelMode(field);
        if (mode === 'none') return 'invalid_value';
        if (mode === 'select') {
            if (!(field.options ?? []).some((o) => o.value === value.level)) return 'not_an_option';
        } else {
            const text = value.level.trim();
            if (text.length > levelMaxLength(field)) return 'too_long';
            if (!isClean(text)) return 'invalid_value';
        }
    }
    for (const key of ['obtainedOn', 'validUntil'] as const) {
        const v = value[key];
        if (v === undefined) continue;
        if (typeof v !== 'string') return 'invalid_type';
        if (!isCredentialDate(v)) return 'invalid_value';
    }
    if (datesOutOfOrder(value)) return 'invalid_value';
    return null;
}

/** Whole days from `from` to `to` (strict ISO dates). */
export function daysBetween(from: string, to: string): number {
    return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * Status of a credential value for `today` (Berlin calendar day, `todayIso()`): a credential is valid THROUGH its `validUntil` day.
 * Same rules as the server (`credentialExpiry`): no value `missing`; no `validUntil` `valid` without a date; before today
 * `expired`; up to `withinDays` ahead `expiring` (0 = last valid day is today); later `valid`.
 */
export function credentialExpiry(value: unknown, today: string, withinDays = DEFAULT_EXPIRING_DAYS): CredentialExpiry {
    const c = asCredential(value);
    if (!c) return { status: 'missing', daysLeft: null, validUntil: null };
    if (!c.validUntil || !isCredentialDate(c.validUntil)) return { status: 'valid', daysLeft: null, validUntil: null };
    const daysLeft = daysBetween(today, c.validUntil);
    return { status: daysLeft < 0 ? 'expired' : daysLeft <= withinDays ? 'expiring' : 'valid', daysLeft, validUntil: c.validUntil };
}

/** A well-formed `expiry` of a response (anything else is treated as "no information"). */
export function asExpiry(value: unknown): CredentialExpiry | null {
    if (!isRecord(value) || !isCredentialStatus(value.status)) return null;
    return {
        status: value.status,
        daysLeft: typeof value.daysLeft === 'number' && Number.isFinite(value.daysLeft) ? value.daysLeft : null,
        validUntil: typeof value.validUntil === 'string' ? value.validUntil : null,
    };
}

export type ExpiryIcon = 'ok' | 'soon' | 'expired' | 'none';
export type ExpiryTone = 'success' | 'warning' | 'destructive' | 'muted';

export interface ExpiryView {
    status: CredentialStatus;
    /** Translation key (`forms.cred.expiry.*`); the text carries the meaning, colour and icon only support it. */
    key: string;
    params: Record<string, string | number>;
    tone: ExpiryTone;
    icon: ExpiryIcon;
}

/**
 * What to show for an expiry: `läuft ab in N Tagen`, `abgelaufen seit N Tagen`, `gültig bis …`, `ohne Ablaufdatum`, `nicht eingetragen`.
 * `date` is the already formatted `validUntil`. `null` = nothing to show.
 */
export function expiryView(expiry: CredentialExpiry | null | undefined, date?: string): ExpiryView | null {
    if (!expiry) return null;
    const days = expiry.daysLeft;
    switch (expiry.status) {
        case 'missing':
            return { status: 'missing', key: 'forms.cred.expiry.missing', params: {}, tone: 'muted', icon: 'none' };
        case 'expired': {
            const n = Math.abs(days ?? 0);
            return n === 1
                ? { status: 'expired', key: 'forms.cred.expiry.expiredOne', params: {}, tone: 'destructive', icon: 'expired' }
                : { status: 'expired', key: 'forms.cred.expiry.expired', params: { days: n }, tone: 'destructive', icon: 'expired' };
        }
        case 'expiring':
            if (days === 0) return { status: 'expiring', key: 'forms.cred.expiry.today', params: {}, tone: 'warning', icon: 'soon' };
            if (days === 1) return { status: 'expiring', key: 'forms.cred.expiry.tomorrow', params: {}, tone: 'warning', icon: 'soon' };
            return { status: 'expiring', key: 'forms.cred.expiry.expiring', params: { days: days ?? 0 }, tone: 'warning', icon: 'soon' };
        case 'valid':
            return expiry.validUntil && date
                ? { status: 'valid', key: 'forms.cred.expiry.validUntil', params: { date }, tone: 'success', icon: 'ok' }
                : { status: 'valid', key: 'forms.cred.expiry.noExpiry', params: {}, tone: 'muted', icon: 'ok' };
    }
}

export interface CredentialTexts {
    yes: string;
    level: (label: string) => string;
    obtained: (date: string) => string;
    until: (date: string) => string;
}

/** One line for a stored credential, e.g. `Ja, Stufe: B, erworben am 01.01.2020, gültig bis 01.01.2027`; `null` = not held. */
export function credentialSummary(value: unknown, options: ReadonlyArray<{ value: string; label: string }> | null | undefined, texts: CredentialTexts, formatDate: (iso: string) => string): string | null {
    const c = asCredential(value);
    if (!c) return null;
    const parts = [texts.yes];
    if (c.level) parts.push(texts.level((options ?? []).find((o) => o.value === c.level)?.label ?? c.level));
    if (c.obtainedOn) parts.push(texts.obtained(formatDate(c.obtainedOn)));
    if (c.validUntil) parts.push(texts.until(formatDate(c.validUntil)));
    return parts.join(', ');
}
