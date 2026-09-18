'use client';

import { useState, FormEvent } from 'react';

import { authClient } from '@/lib/auth-client';
import { useLanguage } from '@/contexts/LanguageContext';

interface TwoFactorPromptProps {
    onVerified: () => void;
    onCancel: () => void;
}

/**
 * Shown after signIn.email() returns a "two factor required" result
 * (Better Auth's twoFactor() plugin short-circuits the normal session
 * creation and expects a follow-up call to twoFactor.verifyTotp()).
 * Deliberately minimal: a single code field, no "trust this device" /
 * backup-code UI, per the "don't over-engineer" scope for this template.
 */
export function TwoFactorPrompt({ onVerified, onCancel }: TwoFactorPromptProps) {
    const { t } = useLanguage();
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const { error: verifyError } = await authClient.twoFactor.verifyTotp({
            code,
        });

        setIsSubmitting(false);

        if (verifyError) {
            setError(verifyError.message ?? t('auth.2fa.error'));
            return;
        }

        onVerified();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center">
                <h3 className="text-lg font-bold text-foreground">{t('auth.2fa.title')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t('auth.2fa.subtitle')}
                </p>
            </div>

            <div>
                <label htmlFor="totp-code" className="block text-sm font-medium text-foreground">
                    {t('auth.2fa.codeLabel')}
                </label>
                <input
                    id="totp-code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-center text-lg tracking-[0.5em] shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="000000"
                />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                    {t('auth.2fa.cancel')}
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || code.length !== 6}
                    className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-50 transition-colors"
                >
                    {isSubmitting ? t('auth.2fa.verifying') : t('auth.2fa.verify')}
                </button>
            </div>
        </form>
    );
}
