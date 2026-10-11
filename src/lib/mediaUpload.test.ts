import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { mediaErrorKey } from './mediaUpload';

describe('mediaErrorKey', () => {
    it('maps the quota code', () => {
        expect(mediaErrorKey(new ApiError(422, 'QUOTA_EXCEEDED', 'The storage quota of this club is exhausted'))).toBe('media.err.quota');
    });
    it('maps size, type and unknown-key validation errors', () => {
        expect(mediaErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'File exceeds maximum size of 10485760 bytes'))).toBe('media.err.sizeApi');
        expect(mediaErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'Unsupported file type (allowed: image/jpeg)'))).toBe('media.err.type');
        expect(mediaErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'Unknown media key: upload the image'))).toBe('media.err.key');
        expect(mediaErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'Corrupt image: x'))).toBe('media.err.invalid');
    });
    it('maps rate limiting and falls back to the shared member errors', () => {
        expect(mediaErrorKey(new ApiError(429, 'TOO_MANY_REQUESTS', 'slow down'))).toBe('media.err.rate');
        expect(mediaErrorKey(new ApiError(403, 'FORBIDDEN', 'no'))).toBe(mediaErrorKey(new ApiError(403, 'FORBIDDEN', 'no')));
    });
});
