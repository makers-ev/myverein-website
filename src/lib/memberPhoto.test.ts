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
import { checkPhotoFile, cropRect, initialsOf, isMinorBirthDate, PHOTO_MAX_BYTES, photoErrorKey } from './memberPhoto';

describe('checkPhotoFile', () => {
    it('accepts JPEG, PNG and WebP up to 5 MB', () => {
        expect(checkPhotoFile({ type: 'image/jpeg', size: 1000 })).toBeNull();
        expect(checkPhotoFile({ type: 'image/png', size: PHOTO_MAX_BYTES })).toBeNull();
        expect(checkPhotoFile({ type: 'image/webp', size: 1 })).toBeNull();
    });
    it('rejects other types, oversized and empty files', () => {
        expect(checkPhotoFile({ type: 'image/heic', size: 1000 })).toBe('type');
        expect(checkPhotoFile({ type: 'application/pdf', size: 1000 })).toBe('type');
        expect(checkPhotoFile({ type: 'image/png', size: PHOTO_MAX_BYTES + 1 })).toBe('size');
        expect(checkPhotoFile({ type: 'image/png', size: 0 })).toBe('empty');
    });
});

describe('initialsOf', () => {
    it('takes up to two initials', () => {
        expect(initialsOf('Erika Mustermann')).toBe('EM');
        expect(initialsOf('  anna  maria  schmidt ')).toBe('AM');
        expect(initialsOf('Cher')).toBe('C');
    });
    it('falls back to ?', () => {
        expect(initialsOf(null)).toBe('?');
        expect(initialsOf('   ')).toBe('?');
    });
});

describe('cropRect', () => {
    it('centers the largest square by default', () => {
        expect(cropRect(400, 200)).toEqual({ sx: 100, sy: 0, size: 200 });
        expect(cropRect(200, 400)).toEqual({ sx: 0, sy: 100, size: 200 });
        expect(cropRect(300, 300)).toEqual({ sx: 0, sy: 0, size: 300 });
    });
    it('zooms and shifts inside the image', () => {
        expect(cropRect(400, 400, { zoom: 2, offsetX: -1, offsetY: 1 })).toEqual({ sx: 0, sy: 200, size: 200 });
        expect(cropRect(400, 400, { zoom: 2, offsetX: 0, offsetY: 0 })).toEqual({ sx: 100, sy: 100, size: 200 });
    });
    it('clamps out-of-range and invalid values', () => {
        const r = cropRect(400, 400, { zoom: 99, offsetX: 5, offsetY: Number.NaN });
        expect(r.size).toBe(100);
        expect(r.sx + r.size).toBeLessThanOrEqual(400);
        expect(r.sy).toBe(150);
        expect(cropRect(400, 400, { zoom: 0.1, offsetX: 0, offsetY: 0 }).size).toBe(400);
    });
});

describe('photoErrorKey', () => {
    it('maps the minor rule on the own photo', () => {
        expect(photoErrorKey(new ApiError(403, 'FORBIDDEN', 'x'), true)).toBe('verein.photo.err.minor');
        expect(photoErrorKey(new ApiError(403, 'FORBIDDEN', 'x'), false)).toBe('verein.err.forbidden');
    });
    it('maps upload validation errors', () => {
        expect(photoErrorKey(new ApiError(422, 'QUOTA_EXCEEDED', 'quota'), true)).toBe('verein.photo.err.quota');
        expect(photoErrorKey(new ApiError(422, 'VALIDATION_ERROR', 'File exceeds maximum size of 5242880 bytes'), true)).toBe('verein.photo.err.size');
        expect(photoErrorKey(new ApiError(422, 'VALIDATION_ERROR', 'Unsupported image'), true)).toBe('verein.photo.err.invalid');
        expect(photoErrorKey(new Error('offline'), true)).toBe('verein.err.network');
    });
});

describe('isMinorBirthDate', () => {
    it('is true below 18 and false from the 18th birthday', () => {
        expect(isMinorBirthDate('2008-10-12', '2026-10-11')).toBe(true);
        expect(isMinorBirthDate('2008-10-11', '2026-10-11')).toBe(false);
        expect(isMinorBirthDate('1990-01-01', '2026-10-11')).toBe(false);
    });
    it('treats an unknown birth date as not minor', () => {
        expect(isMinorBirthDate(null, '2026-10-11')).toBe(false);
        expect(isMinorBirthDate('', '2026-10-11')).toBe(false);
    });
});
