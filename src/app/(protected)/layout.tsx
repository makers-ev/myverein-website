import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { authClient } from '@/lib/auth-client';
import IntroModal from '@/components/IntroModal';

/**
 * Fail-safe server-side re-check for everything under the (protected) route
 * group. The backend (auth-backend-template) is the single source of truth
 * for sessions — this app has no session store of its own.
 *
 * Better Auth's cross-origin "separate backend" pattern: `authClient` is
 * configured with `baseURL` pointing at the Hono backend, so
 * `authClient.getSession()` issues a real network request to
 * `${NEXT_PUBLIC_BACKEND_URL}/api/auth/get-session`. On the server that
 * request does NOT automatically carry the browser's session cookie (it's
 * a fresh outgoing fetch from the Next.js server, not a browser request),
 * so we manually forward the incoming request's `Cookie` header via
 * `fetchOptions.headers`. This is the documented approach for apps where
 * Better Auth's server instance lives in a different process/repo than the
 * Next.js app (see better-auth.com/docs/integrations/next -> "Usage with
 * a separate backend").
 */
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const incomingHeaders = await headers();

    const { data: session } = await authClient.getSession({
        fetchOptions: {
            headers: {
                cookie: incomingHeaders.get('cookie') ?? '',
            },
        },
    });

    if (!session) {
        const currentPath = incomingHeaders.get('x-url') ?? '/dashboard';
        redirect(`/login-signup?callbackUrl=${encodeURIComponent(currentPath)}`);
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-background">
            {children}
            <IntroModal />
        </div>
    );
}
