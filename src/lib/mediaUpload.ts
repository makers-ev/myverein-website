import { ApiError, apiFetch } from './api-client';
import { memberErrorKey } from './clubMembers';

/** Limits of `POST /media` (backend `MAX_IMAGE_BYTES`, image allowlist JPEG/PNG/WebP). */
export const MEDIA_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
/** Edge length of the square JPEG a location photo is re-encoded to (upright, metadata-free). */
export const LOCATION_PHOTO_OUTPUT_SIZE = 1024;

/**
 * Uploads an image to the central media layer and returns its storage key. The key (never a URL) is what the feature
 * request carries (`photoKey`); the backend claims it exactly once.
 */
export async function uploadMediaImage(clubId: string, jpeg: Blob, filename = 'photo.jpg'): Promise<string> {
    const body = new FormData();
    body.append('file', jpeg, filename);
    const res = await apiFetch<{ data: { key: string } }>(`/media?clubId=${encodeURIComponent(clubId)}`, { method: 'POST', body });
    return res.data.key;
}

/** Translation key for a failed media upload or a photo-key claim (quota, size, type, rights, ...). */
export function mediaErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        if (err.code === 'QUOTA_EXCEEDED') return 'media.err.quota';
        if (err.status === 413) return 'media.err.sizeApi';
        if (err.status === 422 || err.status === 400) {
            if (/exceeds maximum size/i.test(err.message)) return 'media.err.sizeApi';
            if (/unsupported file type|does not match/i.test(err.message)) return 'media.err.type';
            if (/unknown media key/i.test(err.message)) return 'media.err.key';
            return 'media.err.invalid';
        }
        if (err.status === 429) return 'media.err.rate';
    }
    return memberErrorKey(err);
}
