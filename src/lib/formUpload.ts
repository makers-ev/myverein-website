import { ApiError } from './api-client';
import { backendUrl } from './auth-client';
import type { FormFile } from './formSchema';

/**
 * Builds the `ApiError` of a failed backend response from its status and raw body (`{ error: { code, message, details } }`);
 * a body that is not JSON still yields an error with the status. Shared by the upload (XHR) and the blob downloads.
 */
export function apiErrorFromBody(status: number, text: string): ApiError {
    let code = 'UNKNOWN';
    let message = 'Request failed';
    let details: unknown;
    try {
        const body = JSON.parse(text) as { error?: { code?: string; message?: string; details?: unknown }; code?: string; message?: string };
        code = body.error?.code ?? body.code ?? code;
        message = body.error?.message ?? body.message ?? message;
        details = body.error?.details;
    } catch {
        // non-JSON error body
    }
    return new ApiError(status, code, message, details);
}

/** Percentage 0..100 of an upload progress event; `null` if the total is unknown. */
export function progressPercent(loaded: number, total: number): number | null {
    if (!Number.isFinite(total) || total <= 0) return null;
    return Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
}

/**
 * Uploads one file of a draft (`POST /form-submissions/:id/files`, multipart `file` + `fieldKey`) with progress. `fetch`
 * cannot report upload progress, so this uses XHR with the session cookie. Rejects with an `ApiError` (same shape as
 * `apiFetch`), `TypeError('network')` on a network failure or `Error('aborted')` when `signal` fires.
 */
export function uploadSubmissionFile(
    submissionId: string,
    fieldKey: string,
    file: Blob,
    filename: string,
    onProgress: (percent: number | null) => void,
    signal?: AbortSignal,
): Promise<FormFile> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const body = new FormData();
        body.append('fieldKey', fieldKey);
        body.append('file', file, filename);
        xhr.open('POST', `${backendUrl}/form-submissions/${encodeURIComponent(submissionId)}/files`);
        xhr.withCredentials = true;
        xhr.responseType = 'text';
        xhr.upload.onprogress = (e) => onProgress(e.lengthComputable ? progressPercent(e.loaded, e.total) : null);
        xhr.onerror = () => reject(new TypeError('network'));
        xhr.onabort = () => reject(new Error('aborted'));
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const parsed = JSON.parse(xhr.responseText) as { data?: { file?: FormFile } };
                    if (parsed.data?.file) {
                        resolve(parsed.data.file);
                        return;
                    }
                } catch {
                    // fall through
                }
                reject(new ApiError(xhr.status, 'UNKNOWN', 'Unexpected response'));
                return;
            }
            reject(apiErrorFromBody(xhr.status, xhr.responseText));
        };
        if (signal) {
            if (signal.aborted) {
                reject(new Error('aborted'));
                return;
            }
            signal.addEventListener('abort', () => xhr.abort(), { once: true });
        }
        xhr.send(body);
    });
}

/**
 * Authenticated retrieval of a file as a blob (`fetch` with the session cookie): sensitive documents are never behind a raw
 * or pre-signed URL, so the board fetches them through the feature route and hands the blob to the browser. A failed request
 * becomes the same `ApiError` as `apiFetch`.
 */
export async function fetchAuthedBlob(path: string, signal?: AbortSignal): Promise<Blob> {
    let res: Response;
    try {
        res = await fetch(`${backendUrl}${path}`, { credentials: 'include', cache: 'no-store', signal });
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        throw new TypeError('network');
    }
    if (!res.ok) throw apiErrorFromBody(res.status, await res.text().catch(() => ''));
    return res.blob();
}
