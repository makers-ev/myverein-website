const DEFAULT_REDIRECT = '/settings';

/**
 * Only same-origin relative paths are allowed for the post-login redirect,
 * to prevent open-redirect attacks. `startsWith('/')` alone is not enough --
 * protocol-relative URLs like `//evil.com` also start with `/` but the
 * browser resolves them to `https://evil.com/`, so those must be rejected too.
 */
export function resolveCallbackUrl(raw: string | null): string {
    return raw?.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : DEFAULT_REDIRECT;
}

/**
 * `callbackURL` for the verification e-mail. A non-default post-login target (e.g. `/einladung`) rides along as
 * `?callbackUrl=`, so `/verify-email` (often opened in a new tab) can send the user to the login with the same target.
 */
export function verifyEmailCallback(siteUrl: string, callbackUrl: string): string {
    const base = `${siteUrl}/verify-email`;
    return callbackUrl === DEFAULT_REDIRECT ? base : `${base}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

/** Login link of `/verify-email` that keeps a non-default target. */
export function loginHrefWithCallback(raw: string | null): string {
    const target = resolveCallbackUrl(raw);
    return target === DEFAULT_REDIRECT ? '/login-signup' : `/login-signup?callbackUrl=${encodeURIComponent(target)}`;
}
