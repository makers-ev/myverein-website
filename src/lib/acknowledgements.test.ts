import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { ackErrorKey, answeredPercent, audienceEmpty, cleanAudience, dueSoon, sortInbox } from './acknowledgements';

const row = (over: Partial<Parameters<typeof sortInbox>[0][number]>) => ({ status: 'offen' as const, dueAt: null, requestedAt: '2026-01-01T00:00:00Z', respondedAt: null, ...over });

describe('acknowledgements', () => {
    it('lists open requests first, soonest due date first', () => {
        const sorted = sortInbox([row({ status: 'bestaetigt', respondedAt: '2026-03-01T00:00:00Z' }), row({ dueAt: '2026-06-01' }), row({ dueAt: '2026-05-01' }), row({ dueAt: null })]);
        expect(sorted.map((r) => r.dueAt ?? r.status)).toEqual(['2026-05-01', '2026-06-01', 'offen', 'bestaetigt']);
    });

    it('detects requests that are due soon or late', () => {
        expect(dueSoon('2026-05-03', '2026-05-01')).toBe(true);
        expect(dueSoon('2026-04-01', '2026-05-01')).toBe(true);
        expect(dueSoon('2026-05-10', '2026-05-01')).toBe(false);
        expect(dueSoon(null, '2026-05-01')).toBe(false);
    });

    it('needs at least one audience criterion', () => {
        expect(audienceEmpty({})).toBe(true);
        expect(audienceEmpty({ departmentIds: [] })).toBe(true);
        expect(audienceEmpty({ all: true })).toBe(false);
        expect(audienceEmpty({ clubMemberIds: ['a'] })).toBe(false);
    });

    it('sends only the filled parts of the audience', () => {
        expect(cleanAudience({ all: true, departmentIds: ['d'] })).toEqual({ all: true });
        expect(cleanAudience({ departmentIds: [], categoryKeys: ['k'] })).toEqual({ categoryKeys: ['k'] });
    });

    it('computes the answered share', () => {
        expect(answeredPercent({ offen: 1, bestaetigt: 2, abgelehnt: 1, abgelaufen: 0 })).toBe(75);
        expect(answeredPercent({ offen: 0, bestaetigt: 0, abgelehnt: 0, abgelaufen: 0 })).toBe(0);
    });

    it('maps the documented error codes', () => {
        expect(ackErrorKey(new ApiError(403, 'FORBIDDEN', 'x', { code: 'reauth_failed' }))).toBe('docs.ack.err.reauthFailed');
        expect(ackErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'already_answered' }))).toBe('docs.ack.err.alreadyAnswered');
        expect(ackErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'x', { code: 'audience_empty' }))).toBe('docs.ack.err.audienceEmpty');
        expect(ackErrorKey(new ApiError(404, 'NOT_FOUND', 'x'))).toBe('docs.err.notFound');
    });
});
