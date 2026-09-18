'use client';

import { useState, FormEvent } from 'react';

import { authClient, siteUrl } from '@/lib/auth-client';
import { useLanguage } from '@/contexts/LanguageContext';

interface ForgotPasswordPromptProps {
    onBackToLogin: () => void;
}

/**
 * Self-service "forgot password" flow, toggled from the sign-in form. Sends
 * the reset e-mail via the backend's `/request-password-reset` (better-auth's
 * `sendResetPassword`, which also defaults its callback to this site's
 * `/reset-password` page -- see auth-backend-template/src/auth/auth.ts). The
 * emailed link opens `/reset-password` in the browser, same as the admin's
 * "Send password reset email" action.
 */
export function ForgotPasswordPrompt({ onBackToLogin }: ForgotPasswordPromptProps) {
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const { error: requestError } = await authClient.requestPasswordReset({
            email,
            redirectTo: `${siteUrl}/reset-password`,
        });

        setIsSubmitting(false);

        if (requestError) {
            setError(requestError.message ?? t('auth.forgotPassword.error'));
            return;
        }

        setSent(true);
    }

    if (sent) {
        return (
            <div className="space-y-5">
                <div className="text-center">
                    <h3 className="text-lg font-bold text-foreground">{t('auth.forgotPassword.sent.title')}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('auth.forgotPassword.sent.subtitle')}{' '}
                        <span className="font-medium text-foreground">{email}</span>
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onBackToLogin}
                    className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110 transition-colors"
                >
                    {t('auth.forgotPassword.sent.cta')}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="text-center">
                <h3 className="text-lg font-bold text-foreground">{t('auth.forgotPassword.title')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('auth.forgotPassword.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="forgot-email" className="block text-sm font-medium text-foreground">
                        {t('auth.field.email')}
                    </label>
                    <input
                        id="forgot-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-50 transition-colors"
                >
                    {isSubmitting ? t('auth.submit.pending') : t('auth.forgotPassword.submit')}
                </button>
            </form>

            <button
                type="button"
                onClick={onBackToLogin}
                className="w-full text-center text-sm font-semibold text-primary hover:brightness-110"
            >
                {t('auth.forgotPassword.backToLogin')}
            </button>
        </div>
    );
}
