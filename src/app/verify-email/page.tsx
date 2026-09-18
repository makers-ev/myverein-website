'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Landing page for the verification email link. Better Auth has already
 * verified server-side by the time this loads -- an `error` query param
 * means the token was invalid/expired, its absence means success.
 */
function VerifyEmailPageInner() {
    const { t } = useLanguage();
    const searchParams = useSearchParams();
    const hasError = Boolean(searchParams.get('error'));

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-card p-8 shadow-xl transition-all duration-500 hover:shadow-2xl">
                <div className="flex flex-col items-center text-center">
                    {hasError ? (
                        <div className="mb-6 rounded-full bg-red-100 dark:bg-red-950 p-4">
                            <ExclamationTriangleIcon className="h-12 w-12 text-red-600 dark:text-red-400" />
                        </div>
                    ) : (
                        <div className="mb-6 rounded-full bg-green-100 dark:bg-green-950 p-4">
                            <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
                        </div>
                    )}

                    <h1 className="mb-2 text-3xl font-bold text-card-foreground">
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
                        href="/login-signup"
                        className="block w-full rounded-lg bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:-translate-y-1 hover:brightness-110 active:scale-95"
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
