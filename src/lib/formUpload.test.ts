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
vi.mock('./auth-client', () => ({ backendUrl: 'http://backend.test' }));

import { apiErrorFromBody, progressPercent } from './formUpload';

describe('apiErrorFromBody', () => {
    it('reads the nested Hono error body', () => {
        const err = apiErrorFromBody(422, JSON.stringify({ error: { code: 'QUOTA_EXCEEDED', message: 'full', details: { code: 'club_quota' } } }));
        expect(err).toMatchObject({ status: 422, code: 'QUOTA_EXCEEDED', message: 'full', details: { code: 'club_quota' } });
    });
    it('keeps the status for a body that is not JSON', () => {
        expect(apiErrorFromBody(502, '<html>bad gateway</html>')).toMatchObject({ status: 502, code: 'UNKNOWN' });
        expect(apiErrorFromBody(500, '')).toMatchObject({ status: 500, code: 'UNKNOWN' });
    });
});

describe('progressPercent', () => {
    it('clamps and rounds', () => {
        expect(progressPercent(50, 200)).toBe(25);
        expect(progressPercent(300, 200)).toBe(100);
        expect(progressPercent(1, 3)).toBe(33);
    });
    it('is null for an unknown total', () => {
        expect(progressPercent(5, 0)).toBeNull();
        expect(progressPercent(5, Number.NaN)).toBeNull();
    });
});
