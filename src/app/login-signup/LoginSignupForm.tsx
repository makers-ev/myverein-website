'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { authClient, siteUrl } from '@/lib/auth-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { TwoFactorPrompt } from '@/features/auth/components/TwoFactorPrompt';
import { EmailVerificationPrompt } from '@/features/auth/components/EmailVerificationPrompt';
import { ForgotPasswordPrompt } from '@/features/auth/components/ForgotPasswordPrompt';
import { resolveCallbackUrl } from '@/lib/resolveCallbackUrl';

type Mode = 'sign-in' | 'sign-up';

function LoginSignupFormInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();

    const callbackUrl = resolveCallbackUrl(searchParams.get('callbackUrl'));

    const [mode, setMode] = useState<Mode>('sign-in');
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
    const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        if (mode === 'sign-in') {
            const { data, error: signInError } = await authClient.signIn.email({
                email,
                password,
            });

            setIsSubmitting(false);

            if (signInError) {
                setError(signInError.message ?? t('auth.error.signin'));
                return;
            }

            // The twoFactor() plugin short-circuits normal sign-in and returns
            // `twoFactorRedirect: true` instead of a session when the account
            // has 2FA enabled.
            if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect) {
                setNeedsTwoFactor(true);
                return;
            }

            router.push(callbackUrl);
            return;
        }

        const { error: signUpError } = await authClient.signUp.email({
            name,
            email,
            password,
            callbackURL: `${siteUrl}/verify-email`,
        });

        setIsSubmitting(false);

        if (signUpError) {
            setError(signUpError.message ?? t('auth.error.signup'));
            return;
        }

        setNeedsEmailVerification(true);
    }

    if (needsTwoFactor) {
        return (
            <TwoFactorPrompt
                onVerified={() => router.push(callbackUrl)}
                onCancel={() => setNeedsTwoFactor(false)}
            />
        );
    }

    if (needsEmailVerification) {
        return (
            <EmailVerificationPrompt
                email={email}
                onBackToLogin={() => {
                    setNeedsEmailVerification(false);
                    setMode('sign-in');
                }}
            />
        );
    }

    if (showForgotPassword) {
        return (
            <ForgotPasswordPrompt
                onBackToLogin={() => {
                    setShowForgotPassword(false);
                    setError(null);
                }}
            />
        );
    }

    return (
        <>
            <div className="text-center mb-8">
                <h2 className="text-3xl font-black tracking-tight text-foreground">
                    {mode === 'sign-in' ? t('auth.signin.title') : t('auth.signup.title')}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    {mode === 'sign-in' ? t('auth.signin.subtitle') : t('auth.signup.subtitle')}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {mode === 'sign-up' && (
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-foreground">
                            {t('auth.field.name')}
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            autoComplete="name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                )}

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground">
                        {t('auth.field.email')}
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-foreground">
                        {t('auth.field.password')}
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-50 transition-colors"
                >
                    {isSubmitting
                        ? t('auth.submit.pending')
                        : mode === 'sign-in'
                          ? t('auth.submit.signin')
                          : t('auth.submit.signup')}
                </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === 'sign-in' ? (
                    <>
                        {t('auth.toggle.noAccount')}{' '}
                        <button
                            type="button"
                            onClick={() => {
                                setMode('sign-up');
                                setError(null);
                            }}
                            className="font-semibold text-primary hover:brightness-110"
                        >
                            {t('auth.toggle.signup')}
                        </button>
                    </>
                ) : (
                    <>
                        {t('auth.toggle.haveAccount')}{' '}
                        <button
                            type="button"
                            onClick={() => {
                                setMode('sign-in');
                                setError(null);
                            }}
                            className="font-semibold text-primary hover:brightness-110"
                        >
                            {t('auth.toggle.signin')}
                        </button>
                    </>
                )}
            </p>

            {mode === 'sign-in' && (
                <p className="mt-3 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setShowForgotPassword(true);
                            setError(null);
                        }}
                        className="text-xs font-medium text-muted-foreground underline hover:text-primary transition-colors"
                    >
                        {t('auth.forgotPassword.link')}
                    </button>
                </p>
            )}
        </>
    );
}

export function LoginSignupForm() {
    return (
        <Suspense fallback={null}>
            <LoginSignupFormInner />
        </Suspense>
    );
}
