import { describe, expect, it } from 'vitest';

import { type RegistrationInfo, centsToEuroInput, csvColumnsQuery, formatCost, parseEuroInput, partySizeOptions, rsvpBody, settingsBody, settingsDraft, settingsProblem, statusChoices } from './eventRegistration';

const info = (over: Partial<RegistrationInfo> = {}): RegistrationInfo => ({
    eventId: 'e',
    calendarId: 'c',
    enabled: true,
    open: true,
    closedReason: null,
    deadlineAt: null,
    maxCompanions: 2,
    allowGuests: false,
    costNote: null,
    costCents: null,
    form: null,
    canManage: true,
    manage: { formId: 'f1', formVersion: 2, guestRetentionDays: 14, publicLinkActive: false },
    ...over,
});

describe('registration settings', () => {
    it('builds the PUT body from the draft', () => {
        const d = settingsDraft(info());
        expect(d).toMatchObject({ formId: 'f1', maxCompanions: '2', guestRetentionDays: '14', deadline: '' });
        expect(settingsBody({ ...d, formId: '', allowGuests: true })).toEqual({ enabled: true, formId: null, deadlineAt: null, allowGuests: true, maxCompanions: 2, guestRetentionDays: 14 });
    });

    it('validates companions and retention like the server', () => {
        const d = settingsDraft(info());
        expect(settingsProblem(d)).toBeNull();
        expect(settingsProblem({ ...d, maxCompanions: '20' })).toBe('companions');
        expect(settingsProblem({ ...d, maxCompanions: '-1' })).toBe('companions');
        expect(settingsProblem({ ...d, guestRetentionDays: '0' })).toBe('retention');
        expect(settingsProblem({ ...d, guestRetentionDays: '366' })).toBe('retention');
    });

    it('converts the deadline to an instant', () => {
        const body = settingsBody({ ...settingsDraft(info()), deadline: '2026-11-01T18:00' });
        expect(new Date(body.deadlineAt as string).getTime()).toBe(new Date('2026-11-01T18:00').getTime());
    });
});

describe('cost display', () => {
    it('parses euro input', () => {
        expect(parseEuroInput('')).toBeNull();
        expect(parseEuroInput('5')).toBe(500);
        expect(parseEuroInput('5,5')).toBe(550);
        expect(parseEuroInput('5.25')).toBe(525);
        expect(parseEuroInput('abc')).toBeUndefined();
        expect(parseEuroInput('-1')).toBeUndefined();
        expect(parseEuroInput('1,234')).toBeUndefined();
    });

    it('formats cents', () => {
        expect(centsToEuroInput(550)).toBe('5,50');
        expect(centsToEuroInput(null)).toBe('');
        expect(formatCost(null, 'de')).toBeNull();
        expect(formatCost(500, 'de')).toContain('5,00');
    });
});

describe('rsvp body', () => {
    it('sends no body for the one-click registration', () => {
        expect(rsvpBody({ form: null, maxCompanions: 0 }, 1, {})).toBeUndefined();
    });
    it('sends party size, answers and the person registered for', () => {
        expect(rsvpBody({ form: {} as never, maxCompanions: 3 }, 3, { a: 1 }, 'm1')).toEqual({ partySize: 3, answers: { a: 1 }, forClubMemberId: 'm1' });
    });
    it('offers 1 up to 1 + companions seats', () => {
        expect(partySizeOptions(0)).toEqual([1]);
        expect(partySizeOptions(3)).toEqual([1, 2, 3, 4]);
        expect(partySizeOptions(99)).toHaveLength(20);
    });
});

describe('participants', () => {
    it('orders csv columns canonically and appends form fields', () => {
        expect(csvColumnsQuery(['status', 'name'], ['allergy'])).toBe('name,status,allergy');
    });
    it('offers sensible status changes', () => {
        expect(statusChoices('angemeldet')).toEqual(['warteliste', 'abgesagt']);
        expect(statusChoices('warteliste')).toEqual(['angemeldet', 'abgesagt']);
        expect(statusChoices('unbestaetigt')).toEqual(['abgesagt']);
    });
});
