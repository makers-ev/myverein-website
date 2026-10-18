import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import {
    aggregateDeliveries,
    audienceIsEmpty,
    buildChannels,
    cleanAudience,
    communicationErrorKey,
    communicationGate,
    composeProblem,
    confirmationFromError,
    emptyAudience,
    isoToLocalInput,
    localInputToIso,
    needsConfirmation,
    ownDepartmentIds,
    selectableDepartments,
} from './communication';

const departments = [
    { id: 'd1', name: 'Fussball' },
    { id: 'd2', name: 'Tennis' },
];

describe('communication gate', () => {
    it('denies by default', () => {
        expect(communicationGate([])).toEqual({ writeAll: false, writeDepartment: false, canAuthor: false, canUrgent: false, canSeeRecipients: false });
        expect(communicationGate(null).canAuthor).toBe(false);
        expect(communicationGate(['announcements']).canAuthor).toBe(false);
    });

    it('lets the department scope author but never urgent or see recipients', () => {
        const g = communicationGate(['announcements:write_department']);
        expect(g.canAuthor).toBe(true);
        expect(g.canUrgent).toBe(false);
        expect(g.canSeeRecipients).toBe(false);
    });

    it('gives club-wide authors everything', () => {
        const g = communicationGate(['announcements:write']);
        expect(g).toMatchObject({ canAuthor: true, canUrgent: true, canSeeRecipients: true });
    });
});

describe('department scope', () => {
    it('takes only the departments of abteilungsleitung/trainer roles', () => {
        expect(
            ownDepartmentIds([
                { roleType: 'trainer', departmentId: 'd1' },
                { roleType: 'trainer', departmentId: 'd1' },
                { roleType: 'kassenwart', departmentId: 'd2' },
                { roleType: 'abteilungsleitung', departmentId: null },
            ]),
        ).toEqual(['d1']);
        expect(ownDepartmentIds(undefined)).toEqual([]);
    });

    it('shows only own departments to the department scope and all to club-wide authors', () => {
        const dept = communicationGate(['announcements:write_department']);
        expect(selectableDepartments(dept, departments, ['d2'])).toEqual([departments[1]]);
        expect(selectableDepartments(dept, departments, [])).toEqual([]);
        expect(selectableDepartments(communicationGate(['announcements:write']), departments, [])).toHaveLength(2);
        expect(selectableDepartments(communicationGate([]), departments, ['d1'])).toEqual([]);
    });
});

describe('audience', () => {
    it('is empty without any selector', () => {
        expect(audienceIsEmpty(emptyAudience())).toBe(true);
        expect(audienceIsEmpty({ ...emptyAudience(), all: true })).toBe(false);
        expect(audienceIsEmpty({ ...emptyAudience(), memberIds: ['m1'] })).toBe(false);
        expect(audienceIsEmpty({ includeGuardians: true })).toBe(true);
    });

    it('sends only the set selectors; "all" excludes the rest', () => {
        expect(cleanAudience({ ...emptyAudience(), departmentIds: ['d1'] })).toEqual({ departmentIds: ['d1'], includeGuardians: true });
        expect(cleanAudience({ ...emptyAudience(), all: true, departmentIds: ['d1'] })).toEqual({ all: true, includeGuardians: true });
        expect(cleanAudience({ ...emptyAudience(), roleTypes: ['trainer'], includeGuardians: false })).toEqual({ roleTypes: ['trainer'], includeGuardians: false });
    });

    it('always includes in_app', () => {
        expect(buildChannels([])).toEqual(['in_app']);
        expect(buildChannels(['push', 'email'])).toEqual(['in_app', 'email', 'push']);
    });
});

describe('confirmation', () => {
    it('is needed only above the threshold', () => {
        expect(needsConfirmation(50)).toBe(false);
        expect(needsConfirmation(51)).toBe(true);
        expect(needsConfirmation(10, 5)).toBe(true);
    });

    it('reads the count of the 422 answer', () => {
        const err = new ApiError(422, 'RECIPIENT_CONFIRMATION_REQUIRED', 'x', { recipients: 87, threshold: 50 });
        expect(confirmationFromError(err)).toEqual({ recipients: 87, threshold: 50 });
        expect(confirmationFromError(new ApiError(422, 'OTHER', 'x'))).toBeNull();
        expect(confirmationFromError(new Error('x'))).toBeNull();
    });
});

describe('compose problems', () => {
    const base = { title: 'T', body: 'B', audience: { ...emptyAudience(), all: true }, schedule: false, publishAt: '', expiresAt: '', now: new Date('2030-01-01T10:00:00Z') };

    it('reports the first missing piece', () => {
        expect(composeProblem({ ...base, title: ' ' })).toBe('title');
        expect(composeProblem({ ...base, body: '' })).toBe('body');
        expect(composeProblem({ ...base, audience: emptyAudience() })).toBe('audience');
        expect(composeProblem(base)).toBeNull();
    });

    it('requires a future schedule and an expiry after it', () => {
        expect(composeProblem({ ...base, schedule: true, publishAt: '' })).toBe('publishAt');
        expect(composeProblem({ ...base, schedule: true, publishAt: '2029-01-01T10:00' })).toBe('publishAt');
        expect(composeProblem({ ...base, schedule: true, publishAt: '2031-01-01T10:00', expiresAt: '2030-06-01T10:00' })).toBe('expiresAt');
        expect(composeProblem({ ...base, schedule: true, publishAt: '2031-01-01T10:00', expiresAt: '2031-02-01T10:00' })).toBeNull();
        expect(composeProblem({ ...base, expiresAt: '2029-01-01T10:00' })).toBe('expiresAt');
    });
});

describe('datetime helpers', () => {
    it('round-trips local input values', () => {
        const iso = localInputToIso('2030-05-06T07:08');
        expect(iso).not.toBeNull();
        expect(isoToLocalInput(iso)).toBe('2030-05-06T07:08');
        expect(localInputToIso('')).toBeNull();
        expect(isoToLocalInput(null)).toBe('');
    });
});

describe('delivery aggregate', () => {
    it('groups statuses over channels', () => {
        const agg = aggregateDeliveries({
            recipients: 10,
            read: 4,
            byChannel: {
                in_app: { total: 10, read: 4, statuses: { sent: 10 } },
                email: { total: 8, read: 0, statuses: { sent: 5, failed: 1, bounced: 1, skipped_no_address: 1 } },
                push: { total: 2, read: 0, statuses: { queued: 1, skipped_optout: 1 } },
            },
        });
        expect(agg).toEqual({ recipients: 10, read: 4, delivered: 15, failed: 2, unreachable: 2, pending: 1 });
    });
});

describe('error keys', () => {
    it('maps anti-spam rules to plain-language texts', () => {
        expect(communicationErrorKey(new ApiError(429, 'TOO_MANY_REQUESTS', 'x', { rule: 'announcement.urgent_day' }))).toBe('mitteilungen.err.rule.announcement.urgent_day');
        expect(communicationErrorKey(new ApiError(429, 'TOO_MANY_REQUESTS', 'x', { rule: 'something.else' }))).toBe('mitteilungen.err.tooMany');
        expect(communicationErrorKey(new ApiError(403, 'FORBIDDEN', 'x'))).toBe('verein.err.forbidden');
    });
});
