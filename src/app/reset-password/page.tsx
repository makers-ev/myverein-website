'use client';

import { Suspense, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { authClient } from '@/lib/auth-client';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Landing page for the "forgot password" email link. Better Auth's GET
 * /reset-password/:token callback (`requestPasswordResetCallback`) has
 * already validated the token server-side by the time this loads, and
 * redirects here with either `?token=...` (valid, ready to submit a new
 * password) or `?error=...` (invalid/expired) -- same pattern as
 * /verify-email's `error` param.
 */
function ResetPasswordPageInner() {
    const { t } = useLanguage();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const hasError = Boolean(searchParams.get('error')) || !token;

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (newPassword !== confirmPassword) {
            setError(t('auth.resetPassword.mismatchError'));
            return;
        }

        setIsSubmitting(true);
        const { error: resetError } = await authClient.resetPassword({ newPassword, token: token as string });
        setIsSubmitting(false);

        if (resetError) {
            setError(resetError.message ?? t('auth.resetPassword.error'));
            return;
        }

        setSuccess(true);
    }

    if (hasError) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
                <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-card p-8 shadow-xl transition-all duration-500 hover:shadow-2xl">
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-6 rounded-full bg-red-100 dark:bg-red-950 p-4">
                            <ExclamationTriangleIcon className="h-12 w-12 text-red-600 dark:text-red-400" />
                        </div>
                        <h1 className="mb-2 text-3xl font-bold text-card-foreground">
                            {t('auth.resetPassword.invalidLink.title')}
                        </h1>
                        <p className="mb-8 text-lg text-muted-foreground">
                            {t('auth.resetPassword.invalidLink.subtitle')}
                        </p>
                        <Link
                            href="/login-signup"
                            className="block w-full rounded-lg bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:-translate-y-1 hover:brightness-110 active:scale-95"
                        >
                            {t('auth.resetPassword.invalidLink.cta')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
                <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-card p-8 shadow-xl transition-all duration-500 hover:shadow-2xl">
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-6 rounded-full bg-green-100 dark:bg-green-950 p-4">
                            <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
                        </div>
                        <h1 className="mb-2 text-3xl font-bold text-card-foreground">
                            {t('auth.resetPassword.success.title')}
                        </h1>
                        <p className="mb-8 text-lg text-muted-foreground">
                            {t('auth.resetPassword.success.subtitle')}
                        </p>
                        <Link
                            href="/login-signup"
                            className="block w-full rounded-lg bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:-translate-y-1 hover:brightness-110 active:scale-95"
                        >
                            {t('auth.resetPassword.success.cta')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-black tracking-tight text-foreground">
                        {t('auth.resetPassword.page.title')}
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">{t('auth.resetPassword.page.subtitle')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-foreground">
                            {t('auth.resetPassword.field.newPassword')}
                        </label>
                        <input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                            {t('auth.resetPassword.field.confirmPassword')}
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? t('auth.submit.pending') : t('auth.resetPassword.submit')}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordPageInner />
        </Suspense>
    );
}
