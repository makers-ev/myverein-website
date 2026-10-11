import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { memberErrorKey } from './clubMembers';
import { isMediaClaimError, locationPhotoField, mediaErrorKey } from './mediaUpload';

const quota = (reason?: string) => new ApiError(422, 'QUOTA_EXCEEDED', 'quota', reason ? { code: reason } : undefined);

describe('mediaErrorKey', () => {
    it('distinguishes club quota from the unsaved-upload cap', () => {
        expect(mediaErrorKey(quota('club_quota'))).toBe('media.err.quota');
        expect(mediaErrorKey(quota('unattached_cap'))).toBe('media.err.unattachedCap');
        expect(mediaErrorKey(quota())).toBe('media.err.quota');
    });
    it('maps size, type and unknown-key validation errors', () => {
        expect(mediaErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'File exceeds maximum size of 10485760 bytes'))).toBe('media.err.sizeApi');
        expect(mediaErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'Unsupported file type (allowed: image/jpeg)'))).toBe('media.err.type');
        expect(mediaErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'Unknown media key: upload the image'))).toBe('media.err.key');
        expect(mediaErrorKey(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'Corrupt image: x'))).toBe('media.err.invalid');
        expect(mediaErrorKey(new ApiError(429, 'TOO_MANY_REQUESTS', 'slow down'))).toBe('media.err.rate');
    });
    it('falls back to the shared member errors for everything else', () => {
        const err = new ApiError(403, 'FORBIDDEN', 'no');
        expect(mediaErrorKey(err)).toBe(memberErrorKey(err));
        expect(mediaErrorKey(new Error('offline'))).toBe(memberErrorKey(new Error('offline')));
    });
});

describe('isMediaClaimError', () => {
    it('is true only for quota and unknown-key errors, not for other 422s', () => {
        expect(isMediaClaimError(quota('club_quota'))).toBe(true);
        expect(isMediaClaimError(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'Unknown media key: x'))).toBe(true);
        expect(isMediaClaimError(new ApiError(422, 'UNPROCESSABLE_ENTITY', 'Invalid request body'))).toBe(false);
        expect(isMediaClaimError(new Error('x'))).toBe(false);
    });
});

describe('locationPhotoField', () => {
    it('omits an unchanged photo', () => {
        expect(locationPhotoField(undefined, true)).toEqual({});
        expect(locationPhotoField(undefined, false)).toEqual({});
    });
    it('sends null only on PATCH (removal), never on create', () => {
        expect(locationPhotoField(null, true)).toEqual({ photoKey: null });
        expect(locationPhotoField(null, false)).toEqual({});
    });
    it('sends a new key on create and PATCH', () => {
        expect(locationPhotoField('club/abc.jpg', true)).toEqual({ photoKey: 'club/abc.jpg' });
        expect(locationPhotoField('club/abc.jpg', false)).toEqual({ photoKey: 'club/abc.jpg' });
    });
});
