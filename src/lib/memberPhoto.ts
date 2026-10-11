import { ApiError } from './api-client';
import { memberErrorKey, todayIso } from './clubMembers';

/** Upload limits of `PUT /club-members/me/photo` and `/:id/photo` (backend `MAX_PHOTO_BYTES`, allowlist). */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** Edge length of the square JPEG that is uploaded (the pickers never send camera-sized originals). */
export const PHOTO_OUTPUT_SIZE = 512;

export type PhotoFileProblem = 'empty' | 'type' | 'size';

/** Client-side pre-check of a picked file; the backend re-checks magic bytes and size. `null` = acceptable. */
export function checkPhotoFile(file: { type: string; size: number }): PhotoFileProblem | null {
    if (file.size <= 0) return 'empty';
    if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) return 'type';
    if (file.size > PHOTO_MAX_BYTES) return 'size';
    return null;
}

/** Up to two initials for the avatar fallback (`null`/blank => `?`). */
export function initialsOf(name: string | null | undefined): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return parts
        .slice(0, 2)
        .map((p) => Array.from(p)[0] ?? '')
        .join('')
        .toUpperCase();
}

export interface CropState {
    /** 1 = the largest centered square, larger values zoom in. */
    zoom: number;
    /** -1..1 shift of the square along x / y (0 = centered). */
    offsetX: number;
    offsetY: number;
}

export const DEFAULT_CROP: CropState = { zoom: 1, offsetX: 0, offsetY: 0 };
export const MAX_ZOOM = 4;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Source square (in source pixels) for the given crop; always inside the image. */
export function cropRect(srcW: number, srcH: number, crop: CropState = DEFAULT_CROP): { sx: number; sy: number; size: number } {
    const zoom = clamp(Number.isFinite(crop.zoom) ? crop.zoom : 1, 1, MAX_ZOOM);
    const size = Math.max(1, Math.min(srcW, srcH) / zoom);
    const ox = clamp(Number.isFinite(crop.offsetX) ? crop.offsetX : 0, -1, 1);
    const oy = clamp(Number.isFinite(crop.offsetY) ? crop.offsetY : 0, -1, 1);
    return {
        sx: ((srcW - size) * (ox + 1)) / 2,
        sy: ((srcH - size) * (oy + 1)) / 2,
        size,
    };
}

/**
 * Draws the cropped square onto `canvas` at `outSize`. White underlay so transparent PNG/WebP does not turn black in
 * the JPEG. Works on an `ImageBitmap` created with `imageOrientation: 'from-image'`, i.e. the EXIF rotation is already
 * baked in (the backend strips the orientation flag and does not rotate).
 */
export function drawCrop(canvas: HTMLCanvasElement, bitmap: ImageBitmap, crop: CropState, outSize: number): void {
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { sx, sy, size } = cropRect(bitmap.width, bitmap.height, crop);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outSize, outSize);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, outSize, outSize);
}

/** Decodes a picked file with its EXIF orientation applied. Rejects when the browser cannot decode it. */
export function decodeUpright(file: Blob): Promise<ImageBitmap> {
    return createImageBitmap(file, { imageOrientation: 'from-image' });
}

/** Re-encodes the crop as an upright JPEG (also drops all metadata client-side). */
export function renderCropToJpeg(bitmap: ImageBitmap, crop: CropState, outSize = PHOTO_OUTPUT_SIZE): Promise<Blob> {
    const canvas = document.createElement('canvas');
    drawCrop(canvas, bitmap, crop, outSize);
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed'))), 'image/jpeg', 0.9);
    });
}

/**
 * Translation key for a failed photo upload/removal. A 403 on the *own* photo is the minor rule (the board has to set
 * it); everything else falls back to the shared member error texts.
 */
export function photoErrorKey(err: unknown, own: boolean): string {
    if (err instanceof ApiError) {
        if (err.status === 403 && own) return 'verein.photo.err.minor';
        if (err.status === 422) {
            if (err.code === 'QUOTA_EXCEEDED') return 'verein.photo.err.quota';
            if (/exceeds maximum size|too large|size/i.test(err.message)) return 'verein.photo.err.size';
            return 'verein.photo.err.invalid';
        }
        if (err.status === 413) return 'verein.photo.err.size';
    }
    return memberErrorKey(err);
}

export function photoProblemKey(problem: PhotoFileProblem): string {
    switch (problem) {
        case 'empty':
            return 'verein.photo.err.invalid';
        case 'type':
            return 'verein.photo.err.type';
        case 'size':
            return 'verein.photo.err.size';
    }
}

/** Known birth date (`YYYY-MM-DD`) younger than 18 on `today` (backend `isMinor`); unknown birth date => `false`. */
export function isMinorBirthDate(birthDate: string | null | undefined, today: string = todayIso()): boolean {
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}/.test(birthDate)) return false;
    const [by, bm, bd] = birthDate.slice(0, 10).split('-').map(Number) as [number, number, number];
    const [ty, tm, td] = today.slice(0, 10).split('-').map(Number) as [number, number, number];
    let age = ty - by;
    if (tm < bm || (tm === bm && td < bd)) age -= 1;
    return age < 18;
}
