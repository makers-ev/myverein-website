import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.fn();
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
    return { ApiError, apiFetch: (...a: unknown[]) => apiFetch(...a) };
});

import { ApiError } from './api-client';
import { clearAccountMembersCache, loadAccountMembers } from './clubMembers';

const row = (i: number, extra: object = {}) => ({ id: `cm${i}`, memberId: `m${i}`, hasAccount: true, name: `N${i}`, effectiveStatus: 'aktiv', ...extra });

beforeEach(() => {
    apiFetch.mockReset();
    clearAccountMembersCache();
});

describe('loadAccountMembers', () => {
    it('uses account ids, keeps members who left (flagged) and skips members without account', async () => {
        apiFetch.mockResolvedValue({ data: [row(1), row(2, { effectiveStatus: 'ausgetreten' }), row(3, { hasAccount: false, memberId: null })], total: 3 });
        const list = await loadAccountMembers('c1');
        expect(list).toEqual([
            { id: 'm1', name: 'N1', left: false },
            { id: 'm2', name: 'N2', left: true },
        ]);
    });

    it('walks all pages and shares one request chain between concurrent callers and later calls', async () => {
        const page1 = Array.from({ length: 100 }, (_, i) => row(i));
        apiFetch.mockResolvedValueOnce({ data: page1, total: 101 }).mockResolvedValueOnce({ data: [row(100)], total: 101 });
        const [a, b] = await Promise.all([loadAccountMembers('c1'), loadAccountMembers('c1')]);
        expect(a).toHaveLength(101);
        expect(b).toBe(a);
        expect(apiFetch).toHaveBeenCalledTimes(2);
        await loadAccountMembers('c1');
        expect(apiFetch).toHaveBeenCalledTimes(2);
    });

    it('swallows only 403 (empty list); other errors reject and are not cached', async () => {
        apiFetch.mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'x'));
        await expect(loadAccountMembers('c1')).resolves.toEqual([]);
        clearAccountMembersCache();
        apiFetch.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'boom'));
        await expect(loadAccountMembers('c2')).rejects.toBeInstanceOf(ApiError);
        apiFetch.mockResolvedValueOnce({ data: [row(1)], total: 1 });
        await expect(loadAccountMembers('c2')).resolves.toHaveLength(1);
    });
});
