import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { can } from './clubPermissions';
import {
    contactChanges,
    createPayload,
    emptyContact,
    emptyForm,
    expiringSponsors,
    filterCounts,
    filterSponsors,
    formFromSponsor,
    formProblem,
    isHttpLink,
    logoProblem,
    setPrimary,
    sponsorErrorKey,
    sponsorPatch,
    type Sponsor,
} from './sponsors';

const sponsor = (over: Partial<Sponsor> = {}): Sponsor => ({
    id: 's1',
    name: 'Bäckerei Korn',
    website: 'https://korn.example',
    description: null,
    consideration: 'Bandenwerbung',
    startsOn: '2026-01-01',
    endsOn: '2026-12-31',
    visibility: 'intern',
    notes: null,
    status: 'aktiv',
    expiringSoon: false,
    daysLeft: 120,
    logoUrl: null,
    contacts: [{ id: 'c1', name: 'Erika Korn', role: 'Inhaberin', email: 'erika@korn.example', phone: null, isPrimary: true }],
    linkedAccount: null,
    ...over,
});

describe('formProblem', () => {
    it('needs a name, an http(s) link, a sane period and valid contact emails', () => {
        expect(formProblem(emptyForm())).toBe('sponsors.err.name');
        expect(formProblem({ ...emptyForm(), name: 'X', website: 'javascript:alert(1)' })).toBe('sponsors.err.website');
        expect(formProblem({ ...emptyForm(), name: 'X', startsOn: '2026-05-01', endsOn: '2026-04-01' })).toBe('sponsors.err.period');
        expect(formProblem({ ...emptyForm(), name: 'X', contacts: [{ ...emptyContact(), name: 'A', email: 'kaputt' }] })).toBe('sponsors.err.email');
        expect(formProblem({ ...emptyForm(), name: 'X', website: 'https://x.example', startsOn: '2026-01-01', endsOn: '2026-01-01' })).toBeNull();
    });
    it('ignores contact rows without a name', () => {
        expect(formProblem({ ...emptyForm(), name: 'X', contacts: [{ ...emptyContact(), email: 'kaputt' }] })).toBeNull();
    });
    it('knows http(s) links only', () => {
        expect(isHttpLink('https://a.example/x?y=1')).toBe(true);
        expect(isHttpLink('ftp://a.example')).toBe(false);
        expect(isHttpLink('https://a b')).toBe(false);
    });
});

describe('createPayload', () => {
    it('trims, nulls blanks and keeps exactly one primary contact (first filled row by default)', () => {
        const body = createPayload({
            ...emptyForm(),
            name: '  Korn  ',
            contacts: [{ ...emptyContact(), name: 'A', email: ' a@x.de ' }, { ...emptyContact(), name: '' }, { ...emptyContact(), name: 'B' }],
        });
        expect(body.name).toBe('Korn');
        expect(body.website).toBeNull();
        expect(body.startsOn).toBeNull();
        expect(body.contacts).toEqual([
            { name: 'A', role: null, email: 'a@x.de', phone: null, isPrimary: true },
            { name: 'B', role: null, email: null, phone: null, isPrimary: false },
        ]);
    });
    it('respects an explicitly marked primary contact', () => {
        const body = createPayload({ ...emptyForm(), name: 'K', contacts: setPrimary([{ ...emptyContact(), name: 'A' }, { ...emptyContact(), name: 'B' }], 1) });
        expect(body.contacts.map((c) => c.isPrimary)).toEqual([false, true]);
    });
});

describe('sponsorPatch / contactChanges', () => {
    it('sends only what changed and clears with null', () => {
        const orig = formFromSponsor(sponsor());
        expect(sponsorPatch(orig, orig)).toEqual({});
        expect(sponsorPatch(orig, { ...orig, endsOn: '', consideration: ' neu ', visibility: 'oeffentlich' })).toEqual({ endsOn: null, consideration: 'neu', visibility: 'oeffentlich' });
    });
    it('splits contact edits into create / update / remove', () => {
        const orig = formFromSponsor(sponsor({ contacts: [{ id: 'c1', name: 'A', role: null, email: null, phone: null, isPrimary: true }, { id: 'c2', name: 'B', role: null, email: null, phone: null, isPrimary: false }] })).contacts;
        expect(contactChanges(orig, orig)).toEqual({ create: [], update: [], remove: [] });
        const next = [{ ...orig[0]!, phone: '0123' }, { ...emptyContact(), name: 'C' }];
        const changes = contactChanges(orig, next);
        expect(changes.update.map((c) => c.id)).toEqual(['c1']);
        expect(changes.create.map((c) => c.name)).toEqual(['C']);
        expect(changes.remove).toEqual(['c2']);
    });
    it('removes a stored contact whose name was emptied', () => {
        const orig = formFromSponsor(sponsor()).contacts;
        expect(contactChanges(orig, [{ ...orig[0]!, name: ' ' }]).remove).toEqual(['c1']);
    });
});

describe('overview and filters', () => {
    const list = [
        sponsor({ id: 'a', name: 'Alt', status: 'abgelaufen', daysLeft: null }),
        sponsor({ id: 'b', name: 'Bald', expiringSoon: true, daysLeft: 5 }),
        sponsor({ id: 'c', name: 'Cäsar', expiringSoon: true, daysLeft: 2 }),
        sponsor({ id: 'd', name: 'Demnächst', status: 'geplant', daysLeft: null }),
        sponsor({ id: 'e', name: 'Dauer' }),
    ];
    it('lists expiring sponsors soonest first', () => {
        expect(expiringSponsors(list).map((s) => s.id)).toEqual(['c', 'b']);
    });
    it('filters by status, "runs out soon" and name', () => {
        expect(filterSponsors(list, 'abgelaufen', '').map((s) => s.id)).toEqual(['a']);
        expect(filterSponsors(list, 'laeuft_aus', '').map((s) => s.id)).toEqual(['b', 'c']);
        expect(filterSponsors(list, 'all', 'DA').map((s) => s.id)).toEqual(['e']);
        expect(filterCounts(list)).toEqual({ all: 5, laeuft_aus: 2, aktiv: 3, geplant: 1, abgelaufen: 1 });
    });
});

describe('logoProblem / sponsorErrorKey', () => {
    it('accepts PNG/JPEG/WebP up to 2 MB only', () => {
        expect(logoProblem({ type: 'image/png', size: 1000 })).toBeNull();
        expect(logoProblem({ type: 'application/pdf', size: 1000 })).toBe('sponsors.logo.err.type');
        expect(logoProblem({ type: 'image/webp', size: 2 * 1024 * 1024 + 1 })).toBe('sponsors.logo.err.size');
    });
    it('maps the backend detail codes to plain wording', () => {
        expect(sponsorErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'x', { code: 'invalid_period' }))).toBe('sponsors.err.period');
        expect(sponsorErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'x', [{ path: ['website'], message: 'must be an http(s) link' }]))).toBe('sponsors.err.website');
        expect(sponsorErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'x', { code: 'contact_limit' }))).toBe('sponsors.err.contactLimit');
        expect(sponsorErrorKey(new ApiError(403, 'FORBIDDEN', 'no'))).toBe('verein.err.forbidden');
    });
});

describe('rights', () => {
    it('is deny-by-default', () => {
        expect(can(['sponsors:read'], 'sponsors:write')).toBe(false);
        expect(can([], 'sponsors:read')).toBe(false);
    });
});
