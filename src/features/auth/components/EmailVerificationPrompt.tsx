'use client';

import { useState } from 'react';

import { authClient, siteUrl } from '@/lib/auth-client';
import { useLanguage } from '@/contexts/LanguageContext';

interface EmailVerificationPromptProps {
    email: string;
    onBackToLogin: () => void;
}

/**
 * Shown after signUp.email() succeeds. The account exists but Better Auth
 * requires email verification before it's usable, so this replaces the
 * immediate redirect with a "check your inbox" screen and a resend action.
 */
export function EmailVerificationPrompt({ email, onBackToLogin }: EmailVerificationPromptProps) {
    const { t } = useLanguage();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resent, setResent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleResend() {
        setError(null);
        setResent(false);
        setIsSubmitting(true);

        const { error: resendError } = await authClient.sendVerificationEmail({
            email,
            callbackURL: `${siteUrl}/verify-email`,
        });

        setIsSubmitting(false);

        if (resendError) {
            setError(resendError.message ?? t('auth.verifyEmail.resendError'));
            return;
        }

        setResent(true);
    }

    return (
        <div className="space-y-5">
            <div className="text-center">
                <h3 className="text-lg font-bold text-foreground">{t('auth.verifyEmail.title')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t('auth.verifyEmail.subtitle')} <span className="font-medium text-foreground">{email}</span>
                </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {resent && !error && (
                <p className="text-sm text-green-600">{t('auth.verifyEmail.resent')}</p>
            )}

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onBackToLogin}
                    className="flex-1 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                    {t('auth.verifyEmail.backToLogin')}
                </button>
                <button
                    type="button"
                    onClick={handleResend}
                    disabled={isSubmitting}
                    className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-50 transition-colors"
                >
                    {isSubmitting ? t('auth.verifyEmail.resending') : t('auth.verifyEmail.resend')}
                </button>
            </div>
        </div>
    );
}
