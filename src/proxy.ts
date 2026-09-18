import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * NOTE ON FILE NAME: as of Next.js 16 (the version pinned in this repo's
 * package.json), the `middleware.ts` file convention is deprecated in
 * favor of `proxy.ts` (function renamed `middleware` -> `proxy`); see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
 * `middleware.ts` still works today (with a build-time deprecation
 * warning), but this is a brand-new template, so it's written against the
 * current convention rather than the deprecated one. The task/spec that
 * requested this file called it `middleware.ts` — this is `proxy.ts`
 * instead for that reason.
 *
 * Responsibilities (kept deliberately narrow, per NEW-ARCHITECTURE-README §4):
 *  1. Host header validation (anti-SSRF / anti-host-injection / cache poisoning).
 *  2. A per-request nonce-based Content-Security-Policy header.
 *
 * NOTE on hash-based CSP (ADR-007 §S1, tried and reverted): a static
 * SHA-256 hash for next-themes' inline FOUC script looked like it would let
 * pages drop `connection()`/`headers()` and go back to static/ISR
 * rendering. Verified against a real `next build` + `next start` +
 * headless-Chrome load: it doesn't work with this Next 16 + Turbopack
 * setup. Every page -- including a fully static one -- also ships its own
 * inline RSC hydration payload (`self.__next_f.push(...)`), content that's
 * unique per page AND per build (embeds build-specific chunk filenames), so
 * it can never be hand-hashed here; without a nonce or matching hash those
 * scripts are CSP-blocked and React never hydrates (confirmed: the
 * `<html>` class gets set by the hash-matched next-themes script, but
 * `ThemeToggle`'s `useEffect`-gated real button never replaces its SSR
 * placeholder). Making static pages CSP-strict for real would need an
 * automated post-build step that hashes every generated page's actual
 * inline scripts -- a separate, sizable effort, not a two-constant fix.
 * Static rendering for the public pages is deferred until that exists; see
 * the SEO implementation plan's Open Points.
 *
 * Session/redirect enforcement for protected routes is intentionally NOT
 * done here -- it lives in `src/app/(protected)/layout.tsx`, which talks to
 * the real backend session endpoint. Proxy only ever sees cookies, never a
 * verified session, so per Next's own auth guide it should only be used for
 * optimistic checks -- doing the real check in Proxy against a remote
 * backend on every request (including prefetches) would be slow and is
 * explicitly discouraged.
 */

if (!process.env.ALLOWED_HOSTS) {
    console.error('[SECURITY] ALLOWED_HOSTS env var is not set — all requests will be rejected.');
}

const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().replace(/^https?:\/\//, ''))
    .filter(Boolean);

export function proxy(request: NextRequest) {
    const host = request.headers.get('host');

    // Host header validation (anti-SSRF / anti-host-injection).
    if (!host || !ALLOWED_HOSTS.includes(host)) {
        return new NextResponse('Invalid Host', { status: 400 });
    }

    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
    const isDev = process.env.NODE_ENV === 'development';

    // The backend's origin must be reachable from `connect-src` since the
    // Better Auth client (src/lib/auth-client.ts) fetches it directly from
    // the browser (sign-in/sign-up/session calls never go through this app's
    // own server).
    const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_URL ?? "'self'";

    const cspHeader = `
        default-src 'self';
        script-src 'self' ${isDev ? "'unsafe-inline' 'unsafe-eval'" : `'nonce-${nonce}' 'strict-dynamic'`};
        style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`};
        img-src 'self' blob: data:;
        font-src 'self';
        connect-src 'self' ${backendOrigin};
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        ${isDev ? '' : 'upgrade-insecure-requests;'}
    `;
    const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, ' ').trim();

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);
    // Forward the current path so the (protected) layout can build a
    // callbackUrl without needing a client-side hook.
    requestHeaders.set('x-url', request.nextUrl.pathname + request.nextUrl.search);

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });

    response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
}

export const config = {
    matcher: [
        {
            source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
            missing: [
                { type: 'header', key: 'next-router-prefetch' },
                { type: 'header', key: 'purpose', value: 'prefetch' },
            ],
        },
    ],
};
