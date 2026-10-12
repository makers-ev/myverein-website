import { ApiError } from './api-client';
import { memberErrorKey, todayIso } from './clubMembers';

/** Upload limits of `PUT /club-members/me/photo` and `/:id/photo` (backend `MAX_PHOTO_BYTES`, allowlist). */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** Edge length of the square JPEG that is uploaded (the pickers never send camera-sized originals). */
export const PHOTO_OUTPUT_SIZE = 512;

export type PhotoFileProblem = 'empty' | 'type' | 'size';

/** Client-side pre-check of a picked file; the backend re-checks magic bytes and size. `null` = acceptable. */
export function checkPhotoFile(file: { type: string; size: number }, maxBytes: number = PHOTO_MAX_BYTES): PhotoFileProblem | null {
    if (file.size <= 0) return 'empty';
    if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) return 'type';
    if (file.size > maxBytes) return 'size';
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

/** Decompression-bomb guard: refuse images beyond these dimensions before the browser decodes them. */
export const MAX_SOURCE_EDGE = 8000;
export const MAX_SOURCE_PIXELS = 40_000_000;
/** Working size: a decoded image is scaled down to this edge once (the upload is 512 px anyway). */
export const WORKING_EDGE = 2048;

/** Pixel size from the file header (JPEG SOFn, PNG IHDR, WebP VP8/VP8L/VP8X) without decoding; `null` if unreadable. */
export function readImageSize(b: Uint8Array): { width: number; height: number } | null {
    const u16be = (i: number) => (b[i]! << 8) | b[i + 1]!;
    const u16le = (i: number) => b[i]! | (b[i + 1]! << 8);
    const u24le = (i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
    const ascii = (i: number, n: number) => String.fromCharCode(...Array.from(b.subarray(i, i + n)));
    if (b.length >= 24 && b[0] === 0x89 && ascii(1, 3) === 'PNG') {
        const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
        return { width: dv.getUint32(16), height: dv.getUint32(20) };
    }
    if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
        let i = 2;
        while (i + 9 < b.length) {
            if (b[i] !== 0xff) {
                i += 1;
                continue;
            }
            const marker = b[i + 1]!;
            if (marker === 0xff) {
                i += 1;
                continue;
            }
            if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
                i += 2;
                continue;
            }
            const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
            if (isSof) return { height: u16be(i + 5), width: u16be(i + 7) };
            i += 2 + u16be(i + 2);
        }
        return null;
    }
    if (b.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
        const kind = ascii(12, 4);
        if (kind === 'VP8 ') return { width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff };
        if (kind === 'VP8L') {
            const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
            return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
        }
        if (kind === 'VP8X') return { width: u24le(24) + 1, height: u24le(27) + 1 };
    }
    return null;
}

/** `null` = acceptable, otherwise the problem: unreadable header or too large to decode safely. */
export function checkImageSize(size: { width: number; height: number } | null): 'invalid' | 'dimensions' | null {
    if (!size || size.width < 1 || size.height < 1) return 'invalid';
    if (size.width > MAX_SOURCE_EDGE || size.height > MAX_SOURCE_EDGE || size.width * size.height > MAX_SOURCE_PIXELS) return 'dimensions';
    return null;
}

/** Target size so the longer edge is at most `max` (never upscales). */
export function fitWithin(width: number, height: number, max: number = WORKING_EDGE): { width: number; height: number } {
    const scale = Math.min(1, max / Math.max(width, height));
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Decodes a picked file with its EXIF orientation applied. The header size is checked first (decompression bomb), then
 * the decoded bitmap is scaled down once to `WORKING_EDGE` and the full-size bitmap is closed right away.
 * Rejects with `Error('dimensions')` / `Error('invalid')` / a decode error.
 */
export async function decodeUpright(file: Blob): Promise<ImageBitmap> {
    const head = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
    const problem = checkImageSize(readImageSize(head));
    if (problem) throw new Error(problem);
    const full = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const target = fitWithin(full.width, full.height);
    if (target.width === full.width && target.height === full.height) return full;
    try {
        const canvas = document.createElement('canvas');
        canvas.width = target.width;
        canvas.height = target.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('invalid');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(full, 0, 0, target.width, target.height);
        return await createImageBitmap(canvas);
    } finally {
        full.close();
    }
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

export function photoProblemKey(problem: PhotoFileProblem | 'dimensions' | 'invalid'): string {
    switch (problem) {
        case 'empty':
            return 'verein.photo.err.invalid';
        case 'type':
            return 'verein.photo.err.type';
        case 'size':
            return 'verein.photo.err.size';
        case 'dimensions':
            return 'verein.photo.err.dimensions';
        case 'invalid':
            return 'verein.photo.err.invalid';
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
