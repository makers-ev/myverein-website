import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));

import {
    asCredential,
    asExpiry,
    buildCredential,
    credentialDraft,
    credentialExpiry,
    credentialProblem,
    credentialSummary,
    datesOutOfOrder,
    expiryView,
    isCredentialDate,
    levelMaxLength,
    levelMode,
} from './credentials';

describe('level mode', () => {
    it('is a choice with options, free text with a length limit, otherwise none', () => {
        expect(levelMode({ options: [{ value: 'a' }] })).toBe('select');
        expect(levelMode({ options: [], validation: { maxLength: 60 } })).toBe('text');
        expect(levelMode({ options: null, validation: null })).toBe('none');
        expect(levelMode({})).toBe('none');
    });
    it('limits free text to the definition and never above 200', () => {
        expect(levelMaxLength({ validation: { maxLength: 60 } })).toBe(60);
        expect(levelMaxLength({ validation: { maxLength: 999 } })).toBe(200);
        expect(levelMaxLength({})).toBe(200);
    });
});

describe('building the value', () => {
    it('sends only what is given, with a trimmed level and no empty strings', () => {
        expect(buildCredential({})).toEqual({ valid: true });
        expect(buildCredential({ level: '  B ', obtainedOn: '', validUntil: '2027-01-31' })).toEqual({ valid: true, level: 'B', validUntil: '2027-01-31' });
        expect(buildCredential({ level: '   ' })).toEqual({ valid: true });
    });
    it('round-trips through the draft', () => {
        const value = { valid: true as const, level: 'b', obtainedOn: '2024-01-31', validUntil: '2027-01-31' };
        expect(credentialDraft(value)).toEqual({ level: 'b', obtainedOn: '2024-01-31', validUntil: '2027-01-31' });
        expect(buildCredential(credentialDraft(value))).toEqual(value);
        expect(credentialDraft(null)).toEqual({ level: '', obtainedOn: '', validUntil: '' });
    });
    it('reads only objects with valid: true', () => {
        expect(asCredential({ valid: true, level: 'a' })).toEqual({ valid: true, level: 'a' });
        expect(asCredential({ valid: false })).toBeNull();
        expect(asCredential('x')).toBeNull();
        expect(asCredential(null)).toBeNull();
        expect(asCredential([])).toBeNull();
    });
});

describe('dates', () => {
    it('accepts real days between 1900 and 2100 only', () => {
        expect(isCredentialDate('2024-02-29')).toBe(true);
        expect(isCredentialDate('2023-02-29')).toBe(false);
        expect(isCredentialDate('1899-12-31')).toBe(false);
        expect(isCredentialDate('2101-01-01')).toBe(false);
        expect(isCredentialDate('2024-1-1')).toBe(false);
        expect(isCredentialDate(20240101)).toBe(false);
    });
    it('flags "gültig bis" before "erworben am" and nothing else', () => {
        expect(datesOutOfOrder({ valid: true, obtainedOn: '2024-05-01', validUntil: '2024-04-30' })).toBe(true);
        expect(datesOutOfOrder({ valid: true, obtainedOn: '2024-05-01', validUntil: '2024-05-01' })).toBe(false);
        expect(datesOutOfOrder({ valid: true, validUntil: '2024-04-30' })).toBe(false);
        expect(datesOutOfOrder({ valid: true, obtainedOn: 'x', validUntil: '2024-04-30' })).toBe(false);
        expect(datesOutOfOrder(null)).toBe(false);
    });
});

describe('credentialProblem (mirror of the server codes)', () => {
    const levels = { options: [{ value: 'a' }, { value: 'b' }] };
    const free = { validation: { maxLength: 5 } };
    it('accepts a plain "habe ich" and complete values', () => {
        expect(credentialProblem({}, { valid: true })).toBeNull();
        expect(credentialProblem(levels, { valid: true, level: 'a', obtainedOn: '2024-01-01', validUntil: '2025-01-01' })).toBeNull();
        expect(credentialProblem(free, { valid: true, level: ' Stufe' })).toBeNull();
    });
    it('answers invalid_type for non-objects and wrong member types', () => {
        expect(credentialProblem({}, 'ja')).toBe('invalid_type');
        expect(credentialProblem({}, [true])).toBe('invalid_type');
        expect(credentialProblem(levels, { valid: true, level: 3 })).toBe('invalid_type');
        expect(credentialProblem({}, { valid: true, validUntil: 20270101 })).toBe('invalid_type');
    });
    it('answers invalid_value for valid != true, unknown keys, a level without levels, bad or inverted dates', () => {
        expect(credentialProblem({}, { valid: false })).toBe('invalid_value');
        expect(credentialProblem({}, {})).toBe('invalid_value');
        expect(credentialProblem({}, { valid: true, extra: 1 })).toBe('invalid_value');
        expect(credentialProblem({}, { valid: true, level: 'a' })).toBe('invalid_value');
        expect(credentialProblem({}, { valid: true, validUntil: '2027-13-01' })).toBe('invalid_value');
        expect(credentialProblem({}, { valid: true, obtainedOn: '2024-05-02', validUntil: '2024-05-01' })).toBe('invalid_value');
    });
    it('answers not_an_option and too_long for the level', () => {
        expect(credentialProblem(levels, { valid: true, level: 'z' })).toBe('not_an_option');
        expect(credentialProblem(free, { valid: true, level: 'sechs!' })).toBe('too_long');
    });
    it('refuses unclean level text through the supplied policy', () => {
        expect(credentialProblem(free, { valid: true, level: 'a' }, () => false)).toBe('invalid_value');
    });
});

describe('credentialExpiry (same rules as the server)', () => {
    const today = '2026-10-17';
    it('is missing without a value and valid without a date', () => {
        expect(credentialExpiry(null, today)).toEqual({ status: 'missing', daysLeft: null, validUntil: null });
        expect(credentialExpiry({ valid: true }, today)).toEqual({ status: 'valid', daysLeft: null, validUntil: null });
    });
    it('treats validUntil as valid through that day', () => {
        expect(credentialExpiry({ valid: true, validUntil: '2026-10-17' }, today)).toEqual({ status: 'expiring', daysLeft: 0, validUntil: '2026-10-17' });
        expect(credentialExpiry({ valid: true, validUntil: '2026-10-16' }, today)).toMatchObject({ status: 'expired', daysLeft: -1 });
    });
    it('uses the window for "expiring"', () => {
        expect(credentialExpiry({ valid: true, validUntil: '2027-01-15' }, today)).toMatchObject({ status: 'expiring', daysLeft: 90 });
        expect(credentialExpiry({ valid: true, validUntil: '2027-01-16' }, today)).toMatchObject({ status: 'valid', daysLeft: 91 });
        expect(credentialExpiry({ valid: true, validUntil: '2026-11-16' }, today, 30)).toMatchObject({ status: 'expiring', daysLeft: 30 });
        expect(credentialExpiry({ valid: true, validUntil: '2026-11-17' }, today, 30)).toMatchObject({ status: 'valid' });
    });
});

describe('expiryView', () => {
    it('says it in words with the day count', () => {
        expect(expiryView({ status: 'expiring', daysLeft: 12, validUntil: '2026-10-29' })).toMatchObject({ key: 'forms.cred.expiry.expiring', params: { days: 12 }, tone: 'warning', icon: 'soon' });
        expect(expiryView({ status: 'expiring', daysLeft: 0, validUntil: 'x' })?.key).toBe('forms.cred.expiry.today');
        expect(expiryView({ status: 'expiring', daysLeft: 1, validUntil: 'x' })?.key).toBe('forms.cred.expiry.tomorrow');
        expect(expiryView({ status: 'expired', daysLeft: -3, validUntil: 'x' })).toMatchObject({ key: 'forms.cred.expiry.expired', params: { days: 3 }, tone: 'destructive', icon: 'expired' });
        expect(expiryView({ status: 'expired', daysLeft: -1, validUntil: 'x' })?.key).toBe('forms.cred.expiry.expiredOne');
    });
    it('distinguishes dated, undated and missing credentials', () => {
        expect(expiryView({ status: 'valid', daysLeft: 200, validUntil: '2027-05-05' }, '05.05.2027')).toMatchObject({ key: 'forms.cred.expiry.validUntil', params: { date: '05.05.2027' }, tone: 'success' });
        expect(expiryView({ status: 'valid', daysLeft: null, validUntil: null })?.key).toBe('forms.cred.expiry.noExpiry');
        expect(expiryView({ status: 'missing', daysLeft: null, validUntil: null })).toMatchObject({ key: 'forms.cred.expiry.missing', icon: 'none' });
        expect(expiryView(null)).toBeNull();
        expect(expiryView(undefined)).toBeNull();
    });
    it('reads an expiry of a response defensively', () => {
        expect(asExpiry({ status: 'expired', daysLeft: -2, validUntil: '2026-10-15' })).toEqual({ status: 'expired', daysLeft: -2, validUntil: '2026-10-15' });
        expect(asExpiry({ status: 'weird' })).toBeNull();
        expect(asExpiry(null)).toBeNull();
        expect(asExpiry({ status: 'valid' })).toEqual({ status: 'valid', daysLeft: null, validUntil: null });
    });
});

describe('credentialSummary', () => {
    const texts = { yes: 'Ja', level: (l: string) => `Stufe: ${l}`, obtained: (d: string) => `erworben am ${d}`, until: (d: string) => `gültig bis ${d}` };
    const fmt = (iso: string) => iso.split('-').reverse().join('.');
    it('lists the given parts with the label of the level', () => {
        expect(credentialSummary({ valid: true, level: 'b', obtainedOn: '2020-01-02', validUntil: '2027-03-04' }, [{ value: 'b', label: 'B' }], texts, fmt)).toBe('Ja, Stufe: B, erworben am 02.01.2020, gültig bis 04.03.2027');
        expect(credentialSummary({ valid: true }, null, texts, fmt)).toBe('Ja');
        expect(credentialSummary({ valid: true, level: 'frei' }, null, texts, fmt)).toBe('Ja, Stufe: frei');
        expect(credentialSummary(null, null, texts, fmt)).toBeNull();
    });
});
