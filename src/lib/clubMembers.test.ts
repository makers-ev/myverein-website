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
import { allowedStatusesFromError, applyConflictKind, formatDate, hasPendingExit, historyReasonKey, historyStatusKey, historyUnchangedHeadingKey, memberCountFromError, memberErrorKey, STATUS_TRANSITIONS } from './clubMembers';

describe('memberErrorKey', () => {
    it('maps known backend conflicts to plain-language keys instead of raw strings', () => {
        expect(memberErrorKey(new ApiError(409, 'CONFLICT', 'Member number is already in use'))).toBe('verein.err.memberNumberTaken');
        expect(memberErrorKey(new ApiError(409, 'CONFLICT', 'Member has no account'))).toBe('verein.err.noAccount');
        expect(memberErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'Unknown or archived category'))).toBe('verein.err.categoryUnknown');
        expect(memberErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'Reopening a member who left requires a reason'))).toBe('verein.err.reasonRequired');
    });

    it('maps CSV import and key/WLAN codes', () => {
        expect(memberErrorKey(new ApiError(422, 'VALIDATION_ERROR', 'x', { code: 'csv_too_many_rows' }))).toBe('verein.err.csvTooManyRows');
        expect(memberErrorKey(new ApiError(422, 'VALIDATION_ERROR', 'x', { code: 'import_has_errors' }))).toBe('verein.err.importHasErrors');
        expect(memberErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'import_already_applied' }))).toBe('verein.err.importAlreadyApplied');
        expect(memberErrorKey(new ApiError(422, 'VALIDATION_ERROR', 'x', { code: 'unknown_column' }))).toBe('verein.err.exportColumn');
        expect(memberErrorKey(new ApiError(409, 'CONFLICT', 'Member already holds a key for this location'))).toBe('verein.err.keyAlreadyIssued');
        expect(memberErrorKey(new ApiError(422, 'VALIDATION_ERROR', "A password is required unless security is 'open'"))).toBe('verein.err.wifiPasswordRequired');
        expect(memberErrorKey(new ApiError(422, 'VALIDATION_ERROR', 'x', { code: 'export_too_large' }))).toBe('verein.err.exportTooLarge');
        expect(memberErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'default_calendar_required' }))).toBe('kalender.err.defaultCalendarRequired');
        expect(memberErrorKey(new ApiError(429, 'RATE_LIMITED', 'x'))).toBe('verein.err.rateLimit');
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

describe('applyConflictKind', () => {
    it('tells ALREADY_MEMBER and APPLICATION_PENDING apart', () => {
        expect(applyConflictKind(new ApiError(409, 'ALREADY_MEMBER', 'Already a member of this club'))).toBe('already_member');
        expect(applyConflictKind(new ApiError(409, 'APPLICATION_PENDING', 'An application for this club is already pending'))).toBe('application_pending');
    });
    it('keeps a code-less 409 generic and ignores other statuses', () => {
        expect(applyConflictKind(new ApiError(409, 'CONFLICT', 'x'))).toBe('other');
        expect(applyConflictKind(new ApiError(404, 'NOT_FOUND', 'x'))).toBeNull();
        expect(applyConflictKind(new Error('offline'))).toBeNull();
    });
});

describe('date helpers accept Date and string', () => {
    it('formatDate formats Date objects like their ISO strings', () => {
        const iso = '2026-03-05T23:30:00.000Z';
        expect(formatDate(new Date(iso), 'de')).toBe(formatDate(iso, 'de'));
        expect(formatDate(new Date(iso), 'de')).toBe('6.3.2026');
        expect(formatDate(new Date('x'), 'de')).toBe('—');
        expect(formatDate('2026-03-05', 'de')).toBe('5.3.2026');
    });
});

describe('status history labels', () => {
    it('maps reason codes, keeps free text and handles a missing from status', () => {
        expect(historyReasonKey('created')).toBe('verein.history.reason.created');
        expect(historyReasonKey('merged')).toBe('verein.history.reason.merged');
        expect(historyReasonKey('import')).toBe('verein.history.reason.import');
        expect(historyReasonKey('reopen')).toBe('verein.history.reason.reopen');
        expect(historyReasonKey('Weil er umzieht')).toBeNull();
        expect(historyReasonKey('toString')).toBeNull();
        expect(historyUnchangedHeadingKey('created')).toBe('verein.history.created');
        expect(historyUnchangedHeadingKey('merged')).toBe('verein.history.merged');
        expect(historyUnchangedHeadingKey('import')).toBe('verein.history.unchanged');
        expect(historyUnchangedHeadingKey(null)).toBe('verein.history.unchanged');
        expect(historyStatusKey(null)).toBeNull();
        expect(historyStatusKey('aktiv')).toBe('verein.status.aktiv');
    });
});
