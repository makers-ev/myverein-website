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
    return { ApiError };
});

import { ApiError } from './api-client';
import { memberErrorKey } from './clubMembers';
import {
    canWithdraw,
    clearInviteToken,
    errorDetailsCode,
    INVITE_TOKEN_STORAGE_KEY,
    isOwnerOrgRole,
    isPlausibleInviteToken,
    isValidEmail,
    isValidPrefix,
    noticeRuleText,
    normalizePrefix,
    parseNoticeDays,
    proposedDate,
    resolveInviteToken,
    type TokenStore,
    unlinkBlockers,
} from './memberLifecycle';

function memoryStore(initial: Record<string, string> = {}): TokenStore {
    const data = new Map(Object.entries(initial));
    return {
        getItem: (k) => data.get(k) ?? null,
        setItem: (k, v) => void data.set(k, v),
        removeItem: (k) => void data.delete(k),
    };
}

const TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789_-ABCDEFG';

describe('noticeRuleText', () => {
    it('describes every combination of period and mode', () => {
        expect(noticeRuleText({ noticePeriodDays: null, noticeMode: null }).key).toBe('verein.exit.rule.none');
        expect(noticeRuleText({ noticePeriodDays: 0, noticeMode: 'immediate' }).key).toBe('verein.exit.rule.none');
        expect(noticeRuleText({ noticePeriodDays: 30, noticeMode: null })).toEqual({ key: 'verein.exit.rule.days', params: { days: 30 } });
        expect(noticeRuleText({ noticePeriodDays: 30, noticeMode: 'immediate' }).key).toBe('verein.exit.rule.days');
        expect(noticeRuleText({ noticePeriodDays: null, noticeMode: 'year_end' }).key).toBe('verein.exit.rule.year_end');
        expect(noticeRuleText({ noticePeriodDays: 90, noticeMode: 'quarter_end' })).toEqual({ key: 'verein.exit.rule.days.quarter_end', params: { days: 90 } });
    });
});

describe('settings inputs', () => {
    it('parses the notice period', () => {
        expect(parseNoticeDays('')).toBeNull();
        expect(parseNoticeDays(' 30 ')).toBe(30);
        expect(parseNoticeDays('0')).toBe(0);
        expect(parseNoticeDays('365')).toBe(365);
        expect(parseNoticeDays('366')).toBeUndefined();
        expect(parseNoticeDays('-1')).toBeUndefined();
        expect(parseNoticeDays('1.5')).toBeUndefined();
        expect(parseNoticeDays('abc')).toBeUndefined();
    });

    it('normalises and validates the member number prefix like the backend', () => {
        expect(normalizePrefix(' tsv ')).toBe('TSV');
        expect(normalizePrefix('   ')).toBeNull();
        expect(isValidPrefix('TSV1')).toBe(true);
        expect(isValidPrefix('')).toBe(false);
        expect(isValidPrefix('TOO-LONG')).toBe(false);
        expect(isValidPrefix('ABCDEFGHIJK')).toBe(false);
    });
});

describe('exit requests', () => {
    it('allows withdrawing pending requests and not yet effective approved cancellations only', () => {
        expect(canWithdraw({ status: 'pending', kind: 'cancellation', effectiveOn: null }, '2026-10-11')).toBe(true);
        expect(canWithdraw({ status: 'approved', kind: 'cancellation', effectiveOn: '2026-12-31' }, '2026-10-11')).toBe(true);
        expect(canWithdraw({ status: 'approved', kind: 'cancellation', effectiveOn: '2026-10-11' }, '2026-10-11')).toBe(false);
        expect(canWithdraw({ status: 'approved', kind: 'exclusion', effectiveOn: '2026-12-31' }, '2026-10-11')).toBe(false);
        expect(canWithdraw({ status: 'rejected', kind: 'cancellation', effectiveOn: null }, '2026-10-11')).toBe(false);
    });

    it('prefers the backend proposal for the approval date', () => {
        expect(proposedDate({ proposedEffectiveOn: '2026-12-31', earliestEffectiveOn: '2026-11-30', desiredEffectiveOn: null })).toBe('2026-12-31');
        expect(proposedDate({ proposedEffectiveOn: null, earliestEffectiveOn: '2026-11-30', desiredEffectiveOn: null })).toBe('2026-11-30');
        expect(proposedDate({ proposedEffectiveOn: null, earliestEffectiveOn: null, desiredEffectiveOn: null })).toBeNull();
    });

    it('detects owner roles in a comma separated org role', () => {
        expect(isOwnerOrgRole('owner')).toBe(true);
        expect(isOwnerOrgRole('admin, owner')).toBe(true);
        expect(isOwnerOrgRole('member')).toBe(false);
        expect(isOwnerOrgRole(null)).toBe(false);
    });
});

describe('error codes', () => {
    it('maps details.code to plain-language keys', () => {
        const key = (status: number, code: string) => memberErrorKey(new ApiError(status, 'X', 'English text', { code }));
        expect(key(409, 'owner_protected')).toBe('verein.err.ownerProtected');
        expect(key(403, 'board_protected')).toBe('verein.err.boardProtected');
        expect(key(403, 'self_approval')).toBe('verein.err.selfApproval');
        expect(key(409, 'exit_request_pending')).toBe('verein.err.exitPending');
        expect(key(409, 'exit_already_scheduled')).toBe('verein.err.exitScheduled');
        expect(key(409, 'merge_not_supported')).toBe('verein.err.mergeNotSupported');
    });

    it('maps the message based cases of the new endpoints', () => {
        expect(memberErrorKey(new ApiError(409, 'CONFLICT', 'Member already has an account'))).toBe('verein.err.hasAccount');
        expect(memberErrorKey(new ApiError(409, 'CONFLICT', 'Member has left the club'))).toBe('verein.err.alreadyLeft');
        expect(memberErrorKey(new ApiError(409, 'CONFLICT', 'Exit request can no longer be withdrawn'))).toBe('verein.err.exitDecided');
        expect(memberErrorKey(new ApiError(422, 'X', 'effectiveOn is before the earliest date allowed by the notice period'))).toBe('verein.err.beforeEarliest');
        expect(memberErrorKey(new ApiError(422, 'X', 'effectiveOn is too far in the future'))).toBe('verein.err.dateTooFar');
        expect(memberErrorKey(new ApiError(422, 'X', 'An exclusion requires a reason'))).toBe('verein.err.reasonRequired');
    });

    it('reads details.code only from API errors', () => {
        expect(errorDetailsCode(new ApiError(409, 'X', 'y', { code: 'owner_protected' }))).toBe('owner_protected');
        expect(errorDetailsCode(new ApiError(409, 'X', 'y'))).toBeNull();
        expect(errorDetailsCode(new Error('x'))).toBeNull();
    });
});

describe('unlinkBlockers', () => {
    it('lists non-zero counts in display order', () => {
        const err = new ApiError(409, 'CONFLICT', 'x', { code: 'account_has_open_items', openLoans: 2, keys: 0, roles: 1, guardianLinks: 3, bogus: 9 });
        expect(unlinkBlockers(err)).toEqual([
            { key: 'openLoans', count: 2 },
            { key: 'guardianLinks', count: 3 },
            { key: 'roles', count: 1 },
        ]);
    });

    it('ignores other errors', () => {
        expect(unlinkBlockers(new ApiError(409, 'CONFLICT', 'x', { code: 'owner_protected' }))).toBeNull();
        expect(unlinkBlockers(new ApiError(403, 'FORBIDDEN', 'x', { code: 'account_has_open_items' }))).toBeNull();
        expect(unlinkBlockers(new Error('x'))).toBeNull();
    });
});

describe('invite token handling', () => {
    it('validates tokens and e-mail addresses', () => {
        expect(isPlausibleInviteToken(TOKEN)).toBe(true);
        expect(isPlausibleInviteToken('short')).toBe(false);
        expect(isPlausibleInviteToken('a'.repeat(201))).toBe(false);
        expect(isPlausibleInviteToken('has spaces and symbols!!!!!!!')).toBe(false);
        expect(isPlausibleInviteToken(null)).toBe(false);
        expect(isValidEmail('max@example.org')).toBe(true);
        expect(isValidEmail('max@example')).toBe(false);
        expect(isValidEmail('')).toBe(false);
    });

    it('takes the token from the query and stashes it for the login round trip', () => {
        const store = memoryStore();
        expect(resolveInviteToken(`?token=${TOKEN}`, store)).toBe(TOKEN);
        expect(store.getItem(INVITE_TOKEN_STORAGE_KEY)).toBe(TOKEN);
        // After the redirect to login the URL carries no token any more.
        expect(resolveInviteToken('', store)).toBe(TOKEN);
        clearInviteToken(store);
        expect(resolveInviteToken('', store)).toBeNull();
    });

    it('lets a fresh link win over a stashed token and rejects garbage', () => {
        const store = memoryStore({ [INVITE_TOKEN_STORAGE_KEY]: 'old'.repeat(10) });
        expect(resolveInviteToken(`?token=${TOKEN}`, store)).toBe(TOKEN);
        expect(resolveInviteToken('?token=nope', memoryStore())).toBeNull();
    });
});
