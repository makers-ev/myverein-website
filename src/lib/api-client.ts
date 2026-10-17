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
/** Plain `JSON.parse` (no Date revival); an empty body is `null` like better-fetch's own parser. */
export function parseJsonPlain(text: string): unknown {
    return text === '' ? null : JSON.parse(text);
}

/**
 * Applicant drafts, uploads, the board's application review, the form editor, custom fields and exit requests carry personal data and change between requests: the browser
 * must never answer them from its HTTP cache (the backend's `Cache-Control` is set separately and is not relied upon here).
 */
export function cachePolicyFor(path: string): RequestCache | undefined {
    // Form definitions (drafts hold unpublished wording), custom field definitions/values, the module catalog (`/member-fields/catalog`) and the credential overview (`/club-members/credentials`) (may be sensitive) and exit requests with answers.
    return /^\/(form-submissions|club-forms|club-applications|forms|member-fields|club-exit-requests)(\/|\?|$)/.test(path) || /^\/club-members\/[^/?]+\/custom-fields(\/|\?|$)/.test(path) || /^\/club-members\/credentials(\/|\?|$)/.test(path) || /^\/club-members\/me\/children(\/|\?|$)/.test(path)
        ? 'no-store'
        : undefined;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const { data, error } = await authClient.$fetch<T>(`${backendUrl}${path}`, {
        method: options.method ?? 'GET',
        body: options.body,
        // better-fetch's default parser revives ISO date strings into Date objects; all date helpers (and the types)
        // expect the strings the backend sent, so parse plain.
        jsonParser: parseJsonPlain,
        ...(cachePolicyFor(path) ? { cache: cachePolicyFor(path) } : {}),
        ...(options.cookie ? { headers: { cookie: options.cookie } } : {}),
    });

    if (error) {
        // The Hono backend answers `{ error: { code, message, details? } }` (AppError.toJSON), Better Auth's own
        // routes answer flat `{ code, message }` -- read the nested form first so `code`/`details` (e.g. the
        // `allowed` list of a 409 status change) are not lost.
        const body = error as { code?: string; message?: string; details?: unknown; error?: unknown };
        const nested = body.error && typeof body.error === 'object' ? (body.error as { code?: string; message?: string; details?: unknown }) : null;
        throw new ApiError(
            error.status,
            nested?.code ?? body.code ?? 'UNKNOWN',
            nested?.message ?? body.message ?? 'Request failed',
            nested?.details ?? body.details,
        );
    }

    return data as T;
}
