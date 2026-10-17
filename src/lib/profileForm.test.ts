import { describe, expect, it, vi } from 'vitest';

vi.mock('./api-client', () => {
    class ApiError extends Error {
        constructor(
            readonly status: number,
            readonly code: string,
            message: string,
            readonly details?: unknown,
        ) {
            super(message);
        }
    }
    return { ApiError, apiFetch: vi.fn() };
});

import { ApiError } from './api-client';
import {
    EMPTY_DRAFT,
    buildPatch,
    derivedDisplayName,
    draftFromMember,
    expectedDisplayName,
    firstErrorKey,
    knownKeys,
    mergeServerUpdate,
    serverFieldErrors,
    validateDraft,
} from './profileForm';

const member = { name: 'Max Muster', firstName: 'Max', lastName: 'Muster', street: 'Weg 1', postalCode: '10115', city: 'Berlin', phone: null, contactEmail: 'm@example.com', birthDate: '2000-01-01', emergencyContactName: null, emergencyContactPhone: null };

describe('draftFromMember / knownKeys', () => {
    it('maps null and absent values to empty strings and name to displayName', () => {
        const d = draftFromMember(member);
        expect(d.displayName).toBe('Max Muster');
        expect(d.phone).toBe('');
        expect(draftFromMember({ name: null })).toEqual(EMPTY_DRAFT);
    });

    it('treats absent keys as not delivered, but keeps the name fields editable on an older backend', () => {
        const keys = knownKeys({ name: 'A', birthDate: null });
        expect(keys.has('birthDate')).toBe(true);
        expect(keys.has('street')).toBe(false);
        expect(keys.has('firstName')).toBe(true);
        expect(keys.has('displayName')).toBe(true);
    });
});

describe('buildPatch', () => {
    const base = draftFromMember(member);
    it('sends only changed fields, trimmed', () => {
        expect(buildPatch({ ...base, city: '  Hamburg ', street: 'Weg 1' }, base)).toEqual({ city: 'Hamburg' });
        expect(buildPatch(base, base)).toEqual({});
    });
    it('sends null for cleared optional fields, never an empty display name', () => {
        expect(buildPatch({ ...base, street: ' ', birthDate: '', firstName: '' }, base)).toEqual({ street: null, birthDate: null, firstName: null });
        expect(buildPatch({ ...base, displayName: '  ' }, base)).toEqual({});
    });
    it('ignores keys that were not delivered', () => {
        expect(buildPatch({ ...base, street: 'Neu' }, base, ['city'])).toEqual({});
    });
});

describe('display name rule', () => {
    const base = draftFromMember(member);
    it('derives "First Last" only with both names', () => {
        expect(derivedDisplayName(' Erika ', 'Muster')).toBe('Erika Muster');
        expect(derivedDisplayName('Erika', '')).toBeNull();
    });
    it('predicts what the backend stores', () => {
        const d = { ...base, firstName: 'Erika' };
        expect(expectedDisplayName(d, base, buildPatch(d, base))).toBe('Erika Muster');
        const single = { ...base, lastName: '' };
        expect(expectedDisplayName(single, base, buildPatch(single, base))).toBeNull();
        const explicit = { ...base, firstName: 'Erika', displayName: 'Eri' };
        expect(expectedDisplayName(explicit, base, buildPatch(explicit, base))).toBe('Eri');
        expect(expectedDisplayName(base, base, {})).toBeNull();
    });
});

describe('validateDraft', () => {
    const base = draftFromMember(member);
    it('accepts the valid member', () => expect(validateDraft(base)).toEqual({}));
    it('requires the display name and limits lengths', () => {
        expect(validateDraft({ ...base, displayName: ' ' }).displayName?.key).toBe('verein.profil.err.required');
        expect(validateDraft({ ...base, firstName: 'x'.repeat(101) }).firstName).toEqual({ key: 'verein.profil.err.tooLong', params: { max: 100 } });
        expect(validateDraft({ ...base, displayName: 'x'.repeat(200) }).displayName).toBeUndefined();
    });
    it('rejects control and bidi characters', () => {
        expect(validateDraft({ ...base, firstName: 'Ma\u0000x' }).firstName?.key).toBe('verein.profil.err.chars');
        expect(validateDraft({ ...base, city: 'a‮b' }).city?.key).toBe('verein.profil.err.chars');
        expect(validateDraft({ ...base, street: 'a\nb' }).street?.key).toBe('verein.profil.err.chars');
    });
    it('mirrors the mobile postal code and e-mail rules; empty is fine', () => {
        expect(validateDraft({ ...base, postalCode: '12' }).postalCode?.key).toBe('verein.profil.err.postalCode');
        expect(validateDraft({ ...base, postalCode: '' }).postalCode).toBeUndefined();
        expect(validateDraft({ ...base, contactEmail: 'nope' }).contactEmail?.key).toBe('verein.profil.err.email');
        expect(validateDraft({ ...base, contactEmail: '' }).contactEmail).toBeUndefined();
    });
    it('only checks the given keys', () => {
        expect(validateDraft({ ...base, postalCode: '1' }, ['city'])).toEqual({});
    });
});

describe('mergeServerUpdate', () => {
    it('updates untouched fields and keeps what was typed meanwhile', () => {
        const prev = draftFromMember(member);
        const draft = { ...prev, city: 'Köln' };
        const next = { ...prev, city: 'Berlin2', street: 'Neu 2' };
        const merged = mergeServerUpdate(draft, prev, next);
        expect(merged.city).toBe('Köln');
        expect(merged.street).toBe('Neu 2');
    });
});

describe('serverFieldErrors', () => {
    it('maps details.fields of a 422 to translation keys and drops unknown keys', () => {
        const err = new ApiError(422, 'VALIDATION_ERROR', 'x', { fields: { firstName: 'too_long', displayName: 'required', bogus: 'required' } });
        const out = serverFieldErrors(err)!;
        expect(out.firstName?.key).toBe('forms.err.field.too_long');
        expect(out.displayName?.key).toBe('forms.err.field.required');
        expect(Object.keys(out)).toEqual(['firstName', 'displayName']);
        expect(firstErrorKey(out)).toBe('firstName');
    });
    it('returns null without field details or for other statuses', () => {
        expect(serverFieldErrors(new ApiError(422, 'VALIDATION_ERROR', 'x'))).toBeNull();
        expect(serverFieldErrors(new ApiError(500, 'X', 'x', { fields: { city: 'required' } }))).toBeNull();
        expect(serverFieldErrors(new Error('x'))).toBeNull();
    });
});
