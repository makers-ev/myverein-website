import { describe, expect, it, vi } from 'vitest';

// api-client pulls in the Better Auth client (path alias + env); only the ApiError class is needed here.
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
    return { ApiError };
});

import { ApiError } from './api-client';
import { allowedStatusesFromError, formatDate, hasPendingExit, memberCountFromError, memberErrorKey, STATUS_TRANSITIONS } from './clubMembers';

describe('memberErrorKey', () => {
    it('maps known backend conflicts to plain-language keys instead of raw strings', () => {
        expect(memberErrorKey(new ApiError(409, 'CONFLICT', 'Member number is already in use'))).toBe('verein.err.memberNumberTaken');
        expect(memberErrorKey(new ApiError(409, 'CONFLICT', 'Member has no account'))).toBe('verein.err.noAccount');
        expect(memberErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'Unknown or archived category'))).toBe('verein.err.categoryUnknown');
        expect(memberErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'Reopening a member who left requires a reason'))).toBe('verein.err.reasonRequired');
    });

    it('falls back to generic texts per status and treats non-API errors as network errors', () => {
        expect(memberErrorKey(new ApiError(403, 'FORBIDDEN', 'Missing members:write permission'))).toBe('verein.err.forbidden');
        expect(memberErrorKey(new ApiError(500, 'INTERNAL_ERROR', 'boom'))).toBe('verein.err.server');
        expect(memberErrorKey(new Error('x'))).toBe('verein.err.network');
    });
});

describe('error details', () => {
    it('reads the allowed statuses of a 409', () => {
        const err = new ApiError(409, 'CONFLICT', 'Status change aktiv -> probe is not allowed', { from: 'aktiv', to: 'probe', allowed: ['ruhend', 'bogus', 'ausgetreten'] });
        expect(allowedStatusesFromError(err)).toEqual(['ruhend', 'ausgetreten']);
        expect(allowedStatusesFromError(new ApiError(422, 'X', 'y', { allowed: ['aktiv'] }))).toBeNull();
    });

    it('reads the member count of a category archive conflict', () => {
        expect(memberCountFromError(new ApiError(409, 'CONFLICT', 'Category still has members', { memberCount: 4 }))).toBe(4);
        expect(memberCountFromError(new ApiError(409, 'CONFLICT', 'x'))).toBeNull();
    });
});

describe('status helpers', () => {
    it('only allows reopening to aktiv from a left status', () => {
        expect(STATUS_TRANSITIONS.ausgetreten).toEqual(['aktiv']);
        expect(STATUS_TRANSITIONS.aktiv).not.toContain('probe');
    });

    it('detects a scheduled exit only for live statuses with a future leftAt', () => {
        expect(hasPendingExit({ status: 'aktiv', effectiveStatus: 'aktiv', leftAt: '2999-01-01' })).toBe(true);
        expect(hasPendingExit({ status: 'aktiv', effectiveStatus: 'ausgetreten', leftAt: '2000-01-01' })).toBe(false);
        expect(hasPendingExit({ status: 'aktiv', effectiveStatus: 'aktiv', leftAt: null })).toBe(false);
    });
});

describe('rejoin conflict', () => {
    it('is recognized by details.code, not by message text', () => {
        expect(memberErrorKey(new ApiError(409, 'CONFLICT', 'anything', { code: 'member_rejoin_blocked' }))).toBe('verein.err.rejoinBlocked');
        expect(memberErrorKey(new ApiError(409, 'CONFLICT', 'rejoin blocked'))).toBe('verein.err.conflict');
    });
});

describe('formatDate', () => {
    it('shows a date-only value as the named day', () => {
        expect(formatDate('2026-12-31', 'de')).toBe('31.12.2026');
    });

    it('shows a timestamp as the calendar day in Europe/Berlin', () => {
        // 23:30 UTC on New Year's Eve is already 1 January in Berlin.
        expect(formatDate('2026-12-31T23:30:00.000Z', 'de')).toBe('1.1.2027');
        expect(formatDate(null, 'de')).toBe('—');
    });
});
