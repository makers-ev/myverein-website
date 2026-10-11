'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiFetch } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import { formatDate, memberErrorKey } from '@/lib/clubMembers';
import { clearInviteToken, type InviteAccepted, type InvitePreview, resolveInviteToken } from '@/lib/memberLifecycle';

const RETURN_PATH = '/einladung';

const buttonClass =
    'block w-full rounded-lg bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:brightness-110 active:scale-95 disabled:opacity-50';
const secondaryClass = 'block w-full rounded-lg border border-border px-5 py-3 text-center text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50';

type View =
    | { kind: 'init' }
    | { kind: 'noToken' }
    | { kind: 'redirecting' }
    | { kind: 'loading' }
    | { kind: 'invalid' }
    | { kind: 'error'; textKey: string }
    | { kind: 'preview'; preview: InvitePreview }
    | { kind: 'done'; accepted: InviteAccepted };

function Shell({ children, status }: { children: React.ReactNode; status?: 'ok' | 'warn' }) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-card p-8 shadow-xl">
                <div className="flex flex-col items-center text-center">
                    {status === 'ok' && (
                        <div className="mb-6 rounded-full bg-green-100 p-4 dark:bg-green-950">
                            <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-400" aria-hidden="true" />
                        </div>
                    )}
                    {status === 'warn' && (
                        <div className="mb-6 rounded-full bg-red-100 p-4 dark:bg-red-950">
                            <ExclamationTriangleIcon className="h-12 w-12 text-red-600 dark:text-red-400" aria-hidden="true" />
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </main>
    );
}

/**
 * Invitation landing page. The token is read from the query string once, kept only in `sessionStorage` (so it survives
 * the login round trip) and removed from the visible URL right away (`history.replaceState`) -- it must not stay in the
 * address bar, the browser history or later Referer headers. The login callback is the token-less `/einladung`.
 */
export default function InvitationContent() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const { data: session, isPending } = authClient.useSession();
    const [token, setToken] = useState<string | null | undefined>(undefined);
    // Outcome of the preview request; everything before that is derived below.
    const [result, setResult] = useState<View | null>(null);
    const [accepting, setAccepting] = useState(false);
    const [acceptError, setAcceptError] = useState<string | null>(null);
    const [reload, setReload] = useState(0);

    useEffect(() => {
        const found = resolveInviteToken(window.location.search, window.sessionStorage);
        if (window.location.search) window.history.replaceState(null, '', RETURN_PATH);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setToken(found);
    }, []);

    const signedIn = !!session;
    const ready = token !== undefined && !isPending;

    // Guests go to the login first; the callback is the token-less path, the token waits in sessionStorage.
    useEffect(() => {
        if (ready && token !== null && !signedIn) router.replace(`/login-signup?callbackUrl=${encodeURIComponent(RETURN_PATH)}`);
    }, [ready, token, signedIn, router]);

    useEffect(() => {
        if (!ready || token === null || !signedIn) return;
        let cancelled = false;
        apiFetch<{ data: InvitePreview }>(`/club-members/invites/preview?token=${encodeURIComponent(token)}`)
            .then((res) => {
                if (!cancelled) setResult({ kind: 'preview', preview: res.data });
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                // 404 = unknown, expired or used (indistinguishable); 422 = malformed token.
                if (err instanceof ApiError && (err.status === 404 || err.status === 422)) {
                    clearInviteToken(window.sessionStorage);
                    setResult({ kind: 'invalid' });
                } else {
                    setResult({ kind: 'error', textKey: memberErrorKey(err) });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [ready, token, signedIn, reload]);

    let view: View;
    if (!ready) view = { kind: 'init' };
    else if (token === null) view = { kind: 'noToken' };
    else if (!signedIn) view = { kind: 'redirecting' };
    else view = result ?? { kind: 'loading' };

    const accept = useCallback(async () => {
        if (!token) return;
        setAccepting(true);
        setAcceptError(null);
        try {
            const res = await apiFetch<{ data: InviteAccepted }>('/club-members/invites/accept', { method: 'POST', body: { token } });
            clearInviteToken(window.sessionStorage);
            setResult({ kind: 'done', accepted: res.data });
        } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
                clearInviteToken(window.sessionStorage);
                setResult({ kind: 'invalid' });
            } else if (err instanceof ApiError && err.status === 403 && !(err.details as { code?: unknown } | undefined)?.code) {
                setAcceptError(t('verein.invite.err.emailMismatch'));
            } else {
                setAcceptError(t(memberErrorKey(err)));
            }
        } finally {
            setAccepting(false);
        }
    }, [token, t]);

    async function switchAccount() {
        await authClient.signOut();
        router.replace(`/login-signup?callbackUrl=${encodeURIComponent(RETURN_PATH)}`);
    }

    switch (view.kind) {
        case 'init':
        case 'redirecting':
        case 'loading':
            return (
                <Shell>
                    <h1 className="mb-2 text-2xl font-bold text-card-foreground">{t('verein.invite.title')}</h1>
                    <p role="status" className="text-sm text-muted-foreground">
                        {view.kind === 'redirecting' ? t('verein.invite.redirecting') : t('verein.invite.loading')}
                    </p>
                </Shell>
            );
        case 'noToken':
            return (
                <Shell status="warn">
                    <h1 className="mb-2 text-2xl font-bold text-card-foreground">{t('verein.invite.noToken.title')}</h1>
                    <p className="mb-6 text-sm text-muted-foreground">{t('verein.invite.noToken.body')}</p>
                    <Link href="/" className={secondaryClass}>
                        {t('verein.invite.home')}
                    </Link>
                </Shell>
            );
        case 'invalid':
            return (
                <Shell status="warn">
                    <h1 className="mb-2 text-2xl font-bold text-card-foreground">{t('verein.invite.invalid.title')}</h1>
                    <p className="mb-6 text-sm text-muted-foreground">{t('verein.invite.invalid.body')}</p>
                    <Link href="/verein" className={secondaryClass}>
                        {t('verein.invite.toClub')}
                    </Link>
                </Shell>
            );
        case 'error':
            return (
                <Shell status="warn">
                    <h1 className="mb-2 text-2xl font-bold text-card-foreground">{t('verein.invite.error.title')}</h1>
                    <p role="alert" className="mb-6 text-sm text-muted-foreground">
                        {t(view.textKey)}
                    </p>
                    <button type="button" onClick={() => {
                            setResult(null);
                            setReload((n) => n + 1);
                        }} className={buttonClass}>
                        {t('verein.common.retry')}
                    </button>
                </Shell>
            );
        case 'done':
            return (
                <Shell status="ok">
                    <h1 className="mb-2 text-2xl font-bold text-card-foreground">{t('verein.invite.done.title')}</h1>
                    <p className="mb-6 text-sm text-muted-foreground">{t('verein.invite.done.body', { club: view.accepted.clubName ?? '—' })}</p>
                    <Link href="/verein" className={buttonClass}>
                        {t('verein.invite.toClub')}
                    </Link>
                </Shell>
            );
        case 'preview': {
            const { preview } = view;
            return (
                <Shell>
                    <h1 className="mb-2 text-2xl font-bold text-card-foreground">{t('verein.invite.title')}</h1>
                    <p className="mb-5 text-sm text-muted-foreground">{t('verein.invite.intro', { club: preview.clubName ?? '—' })}</p>
                    <dl className="mb-5 w-full space-y-2 rounded-lg border border-border p-4 text-left text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">{t('verein.invite.club')}</dt>
                            <dd className="font-medium text-foreground">{preview.clubName ?? '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">{t('verein.invite.member')}</dt>
                            <dd className="font-medium text-foreground">{preview.memberName ?? '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">{t('verein.invite.invitedEmail')}</dt>
                            <dd className="font-medium text-foreground">{preview.invitedEmail}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">{t('verein.invite.validUntil')}</dt>
                            <dd className="font-medium text-foreground">{formatDate(preview.expiresAt, language)}</dd>
                        </div>
                    </dl>

                    {preview.emailMatches ? (
                        <>
                            <p className="mb-4 text-xs text-muted-foreground">{t('verein.invite.accept.hint', { email: session?.user.email ?? '' })}</p>
                            <button type="button" onClick={() => void accept()} disabled={accepting} className={buttonClass}>
                                {t('verein.invite.accept')}
                            </button>
                        </>
                    ) : (
                        <div role="alert" className="w-full space-y-3 text-left">
                            <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
                                {t('verein.invite.mismatch', { email: session?.user.email ?? '', invited: preview.invitedEmail })}
                            </p>
                            <button type="button" onClick={() => void switchAccount()} className={buttonClass}>
                                {t('verein.invite.switchAccount')}
                            </button>
                        </div>
                    )}
                    {acceptError && (
                        <p role="alert" className="mt-4 text-sm text-destructive">
                            {acceptError}
                        </p>
                    )}
                </Shell>
            );
        }
    }
}
