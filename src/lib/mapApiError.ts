import { ApiError } from '@/lib/api-client';

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Text key per stable backend error code (compared case-insensitively, the backend sends `QUOTA_EXCEEDED` and `query_too_short` style codes). */
const CODE_KEYS: Record<string, string> = {
    DPA_REQUIRED: 'err.dpaRequired',
    QUOTA_EXCEEDED: 'err.quota',
    ALREADY_MEMBER: 'err.alreadyMember',
    APPLICATION_PENDING: 'err.applicationPending',
    FORM_VERSION_OUTDATED: 'err.formOutdated',
    RECIPIENT_CONFIRMATION_REQUIRED: 'err.recipientConfirmation',
    QUERY_TOO_SHORT: 'err.queryTooShort',
    TOO_MANY_REQUESTS: 'err.tooMany',
};

/**
 * Same name and contract as `mapApiError` in myverein-mobile: the one place that turns a failed request into a plain-language,
 * localized text. Never returns the server's own message. Lookup order: `overrides[code]` (a screen's own wording), the shared
 * code table, the HTTP status, a generic fallback. A non-`ApiError` (fetch threw) is a network problem.
 */
export function mapApiError(err: unknown, t: Translate, overrides: Record<string, string> = {}): string {
    if (!(err instanceof ApiError)) return t('err.network');
    const code = err.code.toUpperCase();
    const detailsCode = ((err.details as { code?: unknown } | undefined)?.code ?? '') as string;
    const own = overrides[code] ?? overrides[err.code] ?? (detailsCode ? overrides[detailsCode] : undefined);
    if (own) return t(own);
    const byCode = CODE_KEYS[code] ?? (detailsCode ? CODE_KEYS[detailsCode.toUpperCase()] : undefined);
    if (byCode) return t(byCode);
    return t(statusKey(err.status));
}

export function statusKey(status: number): string {
    if (status === 401) return 'err.session';
    if (status === 403) return 'err.forbidden';
    if (status === 404) return 'err.notFound';
    if (status === 409) return 'err.conflict';
    if (status === 429) return 'err.tooMany';
    if (status === 400 || status === 413 || status === 422) return 'err.invalid';
    if (status >= 500) return 'err.server';
    return 'err.unknown';
}
