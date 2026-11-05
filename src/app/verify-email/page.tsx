'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { useLanguage } from '@/contexts/LanguageContext';
import { loginHrefWithCallback } from '@/lib/resolveCallbackUrl';

/**
 * Landing page for the verification email link. Better Auth has already
 * verified server-side by the time this loads -- an `error` query param
 * means the token was invalid/expired, its absence means success.
 */
function VerifyEmailPageInner() {
    const { t } = useLanguage();
    const searchParams = useSearchParams();
    const hasError = Boolean(searchParams.get('error'));
    const loginHref = loginHrefWithCallback(searchParams.get('callbackUrl'));

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-md">
                <div className="flex flex-col items-center text-center">
                    {hasError ? (
                        <div className="mb-6 rounded-full bg-destructive/10 p-4">
                            <ExclamationTriangleIcon className="h-12 w-12 text-destructive" />
                        </div>
                    ) : (
                        <div className="mb-6 rounded-full bg-success/10 p-4">
                            <CheckCircleIcon className="h-12 w-12 text-success" />
                        </div>
                    )}

                    <h1 className="mb-2 text-3xl font-medium text-card-foreground">
                        {hasError
                            ? t('auth.verifyEmail.page.errorTitle')
                            : t('auth.verifyEmail.page.successTitle')}
                    </h1>

                    <p className="mb-8 text-lg text-muted-foreground">
                        {hasError
                            ? t('auth.verifyEmail.page.errorSubtitle')
                            : t('auth.verifyEmail.page.successSubtitle')}
                    </p>

                    <Link
                        href={loginHref}
                        className="block w-full rounded-lg bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground transition-transform duration-200  hover:brightness-110 active:scale-[0.98]"
                    >
                        {t('auth.verifyEmail.page.cta')}
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={null}>
            <VerifyEmailPageInner />
        </Suspense>
    );
}
