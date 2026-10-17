import { fieldErrorKey, fieldErrorsFromError } from './formSchema';

/**
 * Pure helpers of the self-service profile ("Mein Profil", `PATCH /club-members/me`): draft <-> member mapping, validation,
 * the "only changed fields" patch and the merge of fresh server values into a draft. No React, no network.
 */

export const PROFILE_KEYS = [
    'firstName',
    'lastName',
    'displayName',
    'contactEmail',
    'phone',
    'street',
    'postalCode',
    'city',
    'birthDate',
    'emergencyContactName',
    'emergencyContactPhone',
] as const;
export type ProfileKey = (typeof PROFILE_KEYS)[number];
export type ProfileDraft = Record<ProfileKey, string>;
export type ProfilePatch = Partial<Record<ProfileKey, string | null>>;

/** Maximum lengths (backend `updateSelfSchema`; the postal code mirrors the mobile app's 3-12 rule). */
export const PROFILE_MAX: Record<Exclude<ProfileKey, 'birthDate'>, number> = {
    firstName: 100,
    lastName: 100,
    displayName: 200,
    contactEmail: 320,
    phone: 50,
    street: 200,
    postalCode: 12,
    city: 120,
    emergencyContactName: 200,
    emergencyContactPhone: 50,
};

/** The member as `GET /club-members/me` delivers it; sensitive keys are absent when the backend does not deliver them. */
export type ProfileSource = { name?: string | null } & Partial<Record<Exclude<ProfileKey, 'displayName'>, string | null>>;

export const EMPTY_DRAFT: ProfileDraft = Object.fromEntries(PROFILE_KEYS.map((k) => [k, ''])) as ProfileDraft;

/** The member's values as a draft; absent/`null` become `''`. `displayName` is `name` of the member shape. */
export function draftFromMember(member: ProfileSource): ProfileDraft {
    const draft = { ...EMPTY_DRAFT };
    for (const key of PROFILE_KEYS) {
        const value = key === 'displayName' ? member.name : member[key];
        draft[key] = typeof value === 'string' ? value : '';
    }
    return draft;
}

/**
 * Keys the backend delivered for the member. `undefined` (key absent) = unknown/not delivered: such a field is neither shown
 * nor sent. The name fields stay editable even when an older backend does not know them yet (they then read as empty).
 */
export function knownKeys(member: ProfileSource): Set<ProfileKey> {
    const known = new Set<ProfileKey>(['firstName', 'lastName', 'displayName']);
    for (const key of PROFILE_KEYS) {
        if (key !== 'displayName' && member[key] !== undefined) known.add(key);
    }
    return known;
}

export type ProfileErrorCode = 'required' | 'tooLong' | 'chars' | 'email' | 'postalCode';
export interface ProfileFieldError {
    /** Translation key (`verein.profil.err.*` or `forms.err.field.*`). */
    key: string;
    params?: Record<string, number>;
}
export type ProfileErrors = Partial<Record<ProfileKey, ProfileFieldError>>;

// Clean-text policy of the backend: no control characters and no bidi controls/isolates.
const CONTROL_OR_BIDI = /[\u0000-\u001F\u007F-\u009F؜‎‏‪-‮⁦-⁩]/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function hasForbiddenChars(value: string): boolean {
    return CONTROL_OR_BIDI.test(value);
}

/** Local validation of the trimmed values of the given keys (the server stays the authority). */
export function validateDraft(draft: ProfileDraft, keys: Iterable<ProfileKey> = PROFILE_KEYS): ProfileErrors {
    const errors: ProfileErrors = {};
    for (const key of keys) {
        const value = draft[key].trim();
        if (key === 'birthDate') continue;
        const max = PROFILE_MAX[key];
        if (key === 'displayName' && value === '') errors[key] = { key: 'verein.profil.err.required' };
        else if (hasForbiddenChars(draft[key])) errors[key] = { key: 'verein.profil.err.chars' };
        else if (value.length > max) errors[key] = { key: 'verein.profil.err.tooLong', params: { max } };
        else if (key === 'postalCode' && value !== '' && value.length < 3) errors[key] = { key: 'verein.profil.err.postalCode' };
        else if (key === 'contactEmail' && value !== '' && !EMAIL_PATTERN.test(value)) errors[key] = { key: 'verein.profil.err.email' };
    }
    return errors;
}

/** Keys whose trimmed value differs from the baseline. */
export function changedKeys(draft: ProfileDraft, base: ProfileDraft, keys: Iterable<ProfileKey> = PROFILE_KEYS): ProfileKey[] {
    return [...keys].filter((k) => draft[k].trim() !== base[k].trim());
}

/** Only the changed fields; a cleared optional field is `null` (the display name cannot be cleared and is never sent empty). */
export function buildPatch(draft: ProfileDraft, base: ProfileDraft, keys: Iterable<ProfileKey> = PROFILE_KEYS): ProfilePatch {
    const patch: ProfilePatch = {};
    for (const key of changedKeys(draft, base, keys)) {
        const value = draft[key].trim();
        if (value === '') {
            if (key !== 'displayName') patch[key] = null;
        } else {
            patch[key] = value;
        }
    }
    return patch;
}

/** The display name the backend derives when both names are given ("First Last"); `null` while one is missing. */
export function derivedDisplayName(firstName: string, lastName: string): string | null {
    const first = firstName.trim();
    const last = lastName.trim();
    return first && last ? `${first} ${last}` : null;
}

/**
 * What the backend will store as display name for this patch, or `null` when it stays as it is. An explicit display name wins;
 * both names given (patch value or unchanged) derive "First Last"; a single name does not change it.
 */
export function expectedDisplayName(draft: ProfileDraft, base: ProfileDraft, patch: ProfilePatch): string | null {
    if (typeof patch.displayName === 'string') return patch.displayName;
    if (!('firstName' in patch) && !('lastName' in patch)) return null;
    const next = derivedDisplayName(draft.firstName, draft.lastName);
    return next !== null && next !== base.displayName.trim() ? next : null;
}

/**
 * Fresh server values flow into every field the user has not touched since the last sync; what was typed meanwhile is kept.
 */
export function mergeServerUpdate(draft: ProfileDraft, previousBase: ProfileDraft, nextBase: ProfileDraft): ProfileDraft {
    const merged = { ...draft };
    for (const key of PROFILE_KEYS) {
        if (draft[key].trim() === previousBase[key].trim()) merged[key] = nextBase[key];
    }
    return merged;
}

/** Per-field errors of a `422` (`details.fields`), as translation keys; keys this form does not have are dropped. `null` = not a field error. */
export function serverFieldErrors(err: unknown): ProfileErrors | null {
    const fields = fieldErrorsFromError(err);
    if (!fields) return null;
    const out: ProfileErrors = {};
    for (const [key, code] of Object.entries(fields)) {
        if ((PROFILE_KEYS as readonly string[]).includes(key)) out[key as ProfileKey] = { key: fieldErrorKey(code) };
    }
    return Object.keys(out).length > 0 ? out : null;
}

/** First key with an error in form order (for focusing). */
export function firstErrorKey(errors: ProfileErrors): ProfileKey | null {
    return PROFILE_KEYS.find((k) => errors[k]) ?? null;
}
