/**
 * Public-only mode: the marketing site shows NO contact, sign-up/login, beta or pilot buttons/links; /contact and
 * /api/contact answer 404 and the sitemap omits /contact and /login-signup. Code is hidden behind this flag, not deleted.
 *
 * Env: `NEXT_PUBLIC_PUBLIC_ONLY` ("true"/"1" or "false"/"0"; inlined at build time).
 * Default on THIS branch (dont-delete/public-website): true. On staging the default is false.
 * The default argument in the `PUBLIC_ONLY` line below is the ONLY intended divergence between the two branches.
 */
export function parsePublicOnly(raw: string | undefined, fallback: boolean): boolean {
    const v = raw?.trim().toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    return fallback;
}

export const PUBLIC_ONLY: boolean = parsePublicOnly(process.env.NEXT_PUBLIC_PUBLIC_ONLY, true);
