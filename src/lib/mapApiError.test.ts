import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api-client';
import { mapApiError } from '@/lib/mapApiError';

const t = (key: string) => key;

describe('mapApiError', () => {
    it('treats a thrown non-ApiError as a network problem', () => {
        expect(mapApiError(new TypeError('Failed to fetch'), t)).toBe('err.network');
    });

    it('maps stable codes case-insensitively and never leaks the server message', () => {
        expect(mapApiError(new ApiError(400, 'query_too_short', 'q must be >= 2'), t)).toBe('err.queryTooShort');
        expect(mapApiError(new ApiError(403, 'DPA_REQUIRED', 'raw text'), t)).toBe('err.dpaRequired');
    });

    it('falls back to the HTTP status', () => {
        expect(mapApiError(new ApiError(401, 'UNAUTHORIZED', 'x'), t)).toBe('err.session');
        expect(mapApiError(new ApiError(404, 'NOT_FOUND', 'x'), t)).toBe('err.notFound');
        expect(mapApiError(new ApiError(502, 'INTERNAL_ERROR', 'x'), t)).toBe('err.server');
        expect(mapApiError(new ApiError(418, 'UNKNOWN', 'x'), t)).toBe('err.unknown');
    });

    it('matches override keys case-insensitively', () => {
        expect(mapApiError(new ApiError(409, 'ALREADY_VOTED', 'x'), t, { already_voted: 'own.key' })).toBe('own.key');
    });

    it('lets a screen override a code', () => {
        expect(mapApiError(new ApiError(409, 'CONFLICT', 'x'), t, { CONFLICT: 'my.key' })).toBe('my.key');
    });
});
