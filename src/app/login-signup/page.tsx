import { connection } from 'next/server';
import Link from 'next/link';

import { createSiteMetadata } from '@/seo/createSiteMetadata';
import { title, description, url, keywords } from '../../../project.config.json';

import { LoginSignupForm } from './LoginSignupForm';

export const metadata = createSiteMetadata({
    title: `Login / Sign Up - ${title}`,
    description,
    url: `${url}/login-signup`,
    keywords: [...keywords, 'login', 'sign up', 'authentication'],
});

export default async function LoginSignupPage() {
    // The proxy (src/proxy.ts) injects a fresh per-request nonce into the
    // Content-Security-Policy header and Next.js applies it automatically
    // to framework scripts during SSR — but only for dynamically rendered
    // pages. Without this, Next would prerender this page at build time
    // (no request/nonce available), so the shipped HTML's <script> tags
    // would have no `nonce` attribute and `strict-dynamic` would cause
    // browsers to block every script on the page. `connection()` forces
    // dynamic rendering. See node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
    // ("Forcing dynamic rendering").
    await connection();

    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background px-4 py-16">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-border bg-card p-8 shadow-xl sm:p-10">
                    <LoginSignupForm />
                </div>
                <p className="mt-6 text-center text-sm text-muted-foreground">
                    <Link href="/" className="font-semibold text-primary hover:brightness-110">
                        ← Back to home
                    </Link>
                </p>
            </div>
        </div>
    );
}
