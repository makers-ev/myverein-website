import { authClient, backendUrl } from '@/lib/auth-client';

/** Mirrors the backend's `AppError`/`ErrorCode` shape (src/lib/errors.ts). */
export class ApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly details?: unknown;

    constructor(status: number, code: string, message: string, details?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

interface ApiFetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    /** Server Component calls need the incoming request's cookie forwarded explicitly, see below. */
    cookie?: string;
}

/**
 * Typed wrapper around `authClient.$fetch`, mirrors myverein-mobile's
 * `src/lib/api.ts` (same two rules: absolute URL via `${backendUrl}${path}`
 * since `authClient` resolves relative paths against `/api/auth`, not the
 * backend root; error message at `error.error.message`/`error.message`).
 *
 * A Server Component's `authClient.$fetch` call is a fresh outgoing request
 * from the Next.js server, not the browser -- it carries no cookie
 * automatically. Pass the incoming request's `Cookie` header explicitly via
 * `cookie` in that case (see `(protected)/layout.tsx` for where to read it
 * from `headers()`); a Client Component omits `cookie` and relies on the
 * browser sending it.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const { data, error } = await authClient.$fetch<T>(`${backendUrl}${path}`, {
        method: options.method ?? 'GET',
        body: options.body,
        ...(options.cookie ? { headers: { cookie: options.cookie } } : {}),
    });

    if (error) {
        throw new ApiError(error.status, (error as { code?: string }).code ?? 'UNKNOWN', error.message ?? 'Request failed');
    }

    return data as T;
}
