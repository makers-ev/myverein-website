import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { type WardEvent, bucketEvents, eventsRange, familieErrorKey, flattenWards, visibleAppLinks, wardKey } from './familie';

const ev = (id: string, startsAt: string): WardEvent => ({
    id,
    calendarId: 'c',
    calendarName: 'Cal',
    title: id,
    description: null,
    startsAt,
    endsAt: null,
    category: null,
    capacity: null,
    locationName: null,
    cancelledAt: null,
    cancelReason: null,
    response: null,
    canRespond: true,
});

describe('bucketEvents', () => {
    it('splits into today, the next six days and later, and drops the past', () => {
        const b = bucketEvents(
            [ev('past', '2026-10-20T16:00:00Z'), ev('today', '2026-10-21T16:00:00Z'), ev('d6', '2026-10-27T16:00:00Z'), ev('d7', '2026-10-28T16:00:00Z')],
            '2026-10-21',
        );
        expect(b.today.map((e) => e.id)).toEqual(['today']);
        expect(b.week.map((e) => e.id)).toEqual(['d6']);
        expect(b.later.map((e) => e.id)).toEqual(['d7']);
    });

    it('uses the Berlin day, not the UTC day, for events near midnight', () => {
        // 22:30 UTC on the 20th is already the 21st in Berlin (CEST).
        expect(bucketEvents([ev('late', '2026-10-20T22:30:00Z')], '2026-10-21').today).toHaveLength(1);
    });
});

describe('eventsRange', () => {
    it('covers today and 13 more days', () => expect(eventsRange('2026-10-21')).toEqual({ from: '2026-10-21', to: '2026-11-03' }));
});

describe('flattenWards / wardKey', () => {
    it('keeps the club of each ward, also for several clubs', () => {
        const ward = { wardId: 'w', name: 'A', firstName: null, relationship: null, canConsent: true, canReportAbsence: true, hasCustody: true, validUntil: null, openConsents: 0 };
        const flat = flattenWards([
            { clubId: 'c1', clubName: 'One', wards: [ward] },
            { clubId: 'c2', clubName: 'Two', wards: [{ ...ward, wardId: 'x' }] },
        ]);
        expect(flat.map(wardKey)).toEqual(['c1:w', 'c2:x']);
        expect(flat[1]!.clubName).toBe('Two');
    });
});

describe('familieErrorKey', () => {
    it('maps the ward-specific codes', () => {
        expect(familieErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'ward_has_account' }))).toBe('familie.err.wardHasAccount');
        expect(familieErrorKey(new ApiError(403, 'FORBIDDEN', 'x', { code: 'guardian_cannot_report_absence' }))).toBe('absence.err.guardianCannot');
        expect(familieErrorKey(new ApiError(404, 'NOT_FOUND', 'x'))).toBe('verein.err.notFound');
    });
});

describe('visibleAppLinks', () => {
    const links = [{ href: '/verein' }, { href: '/kalender' }];
    const family = { href: '/familie' };
    it('hides the links while the scope is unknown', () => expect(visibleAppLinks(links, null, family)).toEqual([]));
    it('falls back to the full menu when the lookup failed', () => expect(visibleAppLinks(links, null, family, true)).toEqual(links));
    it('reduces a guardian-only account to the family area', () => expect(visibleAppLinks(links, { hasClub: false, hasWards: true }, family)).toEqual([family]));
    it('adds the family link for a member with wards', () => expect(visibleAppLinks(links, { hasClub: true, hasWards: true }, family)).toEqual([...links, family]));
    it('does not add it without wards', () => expect(visibleAppLinks(links, { hasClub: true, hasWards: false }, family)).toEqual(links));
});
