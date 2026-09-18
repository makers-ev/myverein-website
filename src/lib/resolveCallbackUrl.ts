const DEFAULT_REDIRECT = '/settings';

/**
 * Only same-origin relative paths are allowed for the post-login redirect,
 * to prevent open-redirect attacks. `startsWith('/')` alone is not enough --
 * protocol-relative URLs like `//evil.com` also start with `/` but the
 * browser resolves them to `https://evil.com/`, so those must be rejected too.
 */
export function resolveCallbackUrl(raw: string | null): string {
    return raw?.startsWith('/') && !raw.startsWith('//') ? raw : DEFAULT_REDIRECT;
}
