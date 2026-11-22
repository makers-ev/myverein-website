'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import { formatDate } from '@/lib/clubMembers';
import {
    acceptFailure,
    clearExternalToken,
    type ExternalPreview,
    INVALID_EXTERNAL_LINK,
    normalizePreview,
    resolveExternalToken,
} from '@/lib/externalAccess';
import { shouldAutoRedirectToLogin } from '@/lib/memberLifecycle';

const RETURN_PATH = '/einladung/extern';
const LOGIN_PATH = `/login-signup?callbackUrl=${encodeURIComponent(RETURN_PATH)}`;

function stores(): Storage[] {
    const s: Storage[] = [window.sessionStorage];
    try {
        s.push(window.localStorage);
    } catch {
        // localStorage blocked: the tab-local copy still works.
    }
    return s;
}

const buttonClass =
    'block min-h-11 w-full rounded-lg bg-primary px-5 py-3 text-center text-sm font-medium text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:opacity-50';
const secondaryClass = 'block min-h-11 w-full rounded-lg border border-control px-5 py-3 text-center text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50';

type View =
    | { kind: 'loading' }
    | { kind: 'noToken' }
    | { kind: 'invalid' }
    | { kind: 'loginNeeded' }
    | { kind: 'error'; textKey: string; retry: boolean }
    | { kind: 'preview'; preview: ExternalPreview }
    | { kind: 'done'; club: string; role: ExternalPreview['roleType'] };

function Shell({ children, status }: { children: React.ReactNode; status?: 'ok' | 'warn' }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <main className="w-full max-w-md overflow-hidden rounded-2xl bg-card p-8 shadow-xl">
                <div className="flex flex-col items-center text-center">
                    {status === 'ok' && (
                        <div className="mb-6 rounded-full bg-success-soft p-4">
                            <CheckCircleIcon className="h-12 w-12 text-success" aria-hidden="true" />
                        </div>
                    )}
                    {status === 'warn' && (
                        <div className="mb-6 rounded-full bg-destructive-soft p-4">
                            <ExclamationTriangleIcon className="h-12 w-12 text-destructive" aria-hidden="true" />
                        </div>
                    )}
                    {children}
                </div>
            </main>
        </div>
    );
}

/**
 * Acceptance page of an external invitation. Same pattern as `/einladung`: the token is read once, kept only in the browser storage (24 h,
 * own key) so it survives sign-in / sign-up and the verification mail, and removed from the address bar at once. After accepting, the person
 * is pointed to the app (the website is for board work; sponsors and providers get a reduced view there and here).
 */
export default function ExternalInvitationContent() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const { data: session, isPending } = authClient.useSession();
    const [token, setToken] = useState<string | null | undefined>(undefined);
    const [result, setResult] = useState<View | null>(null);
    const [accepting, setAccepting] = useState(false);
    const [acceptError, setAcceptError] = useState<{ textKey: string; retry: boolean } | null>(null);
    const [reload, setReload] = useState(0);
    const [fallback, setFallback] = useState<{ email: string } | 'none' | null>(null);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        const found = resolveExternalToken(window.location.search, stores());
        if (window.location.search) window.history.replaceState(null, '', RETURN_PATH);
        if (found === INVALID_EXTERNAL_LINK) clearExternalToken(stores());
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setToken(found);
    }, []);

    const sessionSignedIn = !!session;
    const ready = token !== undefined && !isPending;
    const hasToken = typeof token === 'string' && token !== INVALID_EXTERNAL_LINK;

    // `useSession` can be empty right after the sign-in redirect: ask the backend once; redirect to sign-in at most once a minute.
    useEffect(() => {
        if (!ready || !hasToken || sessionSignedIn) return;
        let cancelled = false;
        authClient
            .getSession()
            .then(({ data }) => {
                if (cancelled) return;
                if (data) setFallback({ email: data.user.email });
                else if (shouldAutoRedirectToLogin(window.sessionStorage)) router.replace(LOGIN_PATH);
                else setFallback('none');
            })
            .catch(() => !cancelled && setFallback('none'));
        return () => {
            cancelled = true;
        };
    }, [ready, hasToken, sessionSignedIn, router]);

    const signedIn = sessionSignedIn || (fallback !== null && fallback !== 'none');
    const accountEmail = session?.user.email ?? (fallback && fallback !== 'none' ? fallback.email : '');

    useEffect(() => {
        if (!ready || !hasToken || !signedIn) return;
        let cancelled = false;
        apiFetch<{ data: unknown }>('/external-access/invites/preview', { method: 'POST', body: { token } })
            .then((res) => {
                if (cancelled) return;
                const preview = normalizePreview(res.data);
                setResult(preview ? { kind: 'preview', preview } : { kind: 'error', textKey: 'ext.accept.err.generic', retry: true });
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const f = acceptFailure(err);
                if (f.drop) {
                    clearExternalToken(stores());
                    setResult({ kind: 'invalid' });
                } else setResult({ kind: 'error', textKey: f.textKey, retry: f.retry });
            });
        return () => {
            cancelled = true;
        };
    }, [ready, hasToken, token, signedIn, reload]);

    let view: View;
    if (token === undefined || isPending) view = { kind: 'loading' };
    else if (token === null) view = { kind: 'noToken' };
    else if (token === INVALID_EXTERNAL_LINK) view = { kind: 'invalid' };
    else if (!signedIn) view = fallback === 'none' ? { kind: 'loginNeeded' } : { kind: 'loading' };
    else view = result ?? { kind: 'loading' };

    const accept = useCallback(async () => {
        if (typeof token !== 'string' || accepting) return;
        setAccepting(true);
        setAcceptError(null);
        try {
            const res = await apiFetch<{ data: { clubName?: string | null; roleType?: string } }>('/external-access/invites/accept', { method: 'POST', body: { token } });
            if (!mounted.current) return;
            clearExternalToken(stores());
            setResult({ kind: 'done', club: res.data.clubName ?? '—', role: res.data.roleType === 'dienstleister' ? 'dienstleister' : 'sponsor' });
        } catch (err) {
            if (!mounted.current) return;
            const f = acceptFailure(err);
            if (f.drop) {
                clearExternalToken(stores());
                setResult({ kind: 'invalid' });
            } else setAcceptError({ textKey: f.textKey, retry: f.retry });
        } finally {
            if (mounted.current) setAccepting(false);
        }
    }, [token, accepting]);

    async function switchAccount() {
        // The token stays (24 h) so the invited account can pick the invitation up after signing in.
        await authClient.signOut();
        router.replace(LOGIN_PATH);
    }

    switch (view.kind) {
        case 'loading':
            return (
                <Shell>
                    <h1 className="mb-2 text-2xl font-bold text-card-foreground">{t('ext.accept.title')}</h1>
                    <p role="status" className="text-sm text-muted-foreground">
                        {t('ext.accept.loading')}
                    </p>
                </Shell>
            );
        case 'loginNeeded':
            return (
                <Shell>
                    <h1 className="mb-2 text-2xl font-bold text-card-foreground">{t('ext.accept.title')}</h1>
                    <p className="mb-6 text-sm text-muted-foreground">{t('ext.accept.loginNeeded')}</p>
                    <Link href={LOGIN_PATH} className={buttonClass}>
                        {t('ext.accept.login')}
                    </Link>
                </Shell>
            );
        case 'noToken':
            return (
                <Shell status="warn">
                    <h1 className="mb-2 text-2xl font-bold text-card-foreground">{t('ext.accept.noToken.title')}</h1>
                    <p className="mb-6 text-sm text-muted-foreground">{t('ext.accept.noToken.body')}</p>
                    <Link href="/" className={secondaryClass}>
                        {t('ext.accept.home')}
                    </Link>
                </Shell>
            );
        case 'invalid':
            return (
                <Shell status="warn">
                    <h1 className="mb-2 text-2xl font-bold text-card-foreground">{t('ext.accept.invalid.title')}</h1>
                    <p className="mb-6 text-sm text-muted-foreground">{t('ext.accept.invalid.body')}</p>
                    <Link href="/" className={secondaryClass}>
                        {t('ext.accept.home')}
                    </Link>
                </Shell>
            );
        case 'error':
            return (
                <Shell status="warn">
                    <h1 className="mb-2 text-2xl font-bold text-card-foreground">{t('ext.accept.error.title')}</h1>
                    <p role="alert" className="mb-6 text-sm text-muted-foreground">
                        {t(view.textKey)}
                    </p>
                    {view.retry ? (
                        <button
                            type="button"
                            onClick={() => {
                                setResult(null);
                                setReload((n) => n + 1);
                            }}
                            className={buttonClass}
                        >
                            {t('ext.accept.retry')}
                        </button>
                    ) : (
                        <Link href="/" className={secondaryClass}>
                            {t('ext.accept.home')}
                        </Link>
                    )}
                </Shell>
            );
        case 'done':
            return (
                <Shell status="ok">
                    <h1 className="mb-2 text-2xl font-bold text-card-foreground">{t('ext.accept.done.title')}</h1>
                    <p className="mb-3 text-sm text-muted-foreground">{t(`ext.accept.done.${view.role}`, { club: view.club })}</p>
                    <p className="mb-6 rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">{t('ext.accept.done.app')}</p>
                    <Link href="/" className={buttonClass}>
                        {t('ext.accept.done.open')}
                    </Link>
                </Shell>
            );
        case 'preview': {
            const { preview } = view;
            return (
                <Shell>
                    <h1 className="mb-2 text-2xl font-bold text-card-foreground">{t('ext.accept.title')}</h1>
                    <p className="mb-5 text-sm text-muted-foreground">{t('ext.accept.intro', { club: preview.clubName ?? '—', role: t(`ext.role.${preview.roleType}`) })}</p>
                    <dl className="mb-5 w-full space-y-2 rounded-lg border border-border p-4 text-left text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">{t('ext.accept.club')}</dt>
                            <dd className="font-medium text-foreground">{preview.clubName ?? '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">{t('ext.accept.role')}</dt>
                            <dd className="font-medium text-foreground">{t(`ext.role.${preview.roleType}`)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">{t('ext.accept.email')}</dt>
                            <dd className="break-all font-medium text-foreground">{preview.invitedEmail}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">{t('ext.accept.validUntil')}</dt>
                            <dd className="font-medium text-foreground">{formatDate(preview.expiresAt, language)}</dd>
                        </div>
                    </dl>
                    <p className="mb-4 w-full rounded-lg bg-muted/50 px-3 py-2 text-left text-xs text-muted-foreground">{t(`ext.role.${preview.roleType}.sees`)} {t('ext.sees.never')}</p>
                    {preview.emailMatches ? (
                        <>
                            <p className="mb-4 text-xs text-muted-foreground">{t('ext.accept.hint', { email: accountEmail })}</p>
                            <button type="button" onClick={() => void accept()} disabled={accepting} className={buttonClass}>
                                {t('ext.accept.action')}
                            </button>
                        </>
                    ) : (
                        <div role="alert" className="w-full space-y-3 text-left">
                            <p className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-foreground">{t('ext.accept.mismatch', { email: accountEmail, invited: preview.invitedEmail })}</p>
                            <button type="button" onClick={() => void switchAccount()} className={buttonClass}>
                                {t('ext.accept.switch')}
                            </button>
                        </div>
                    )}
                    {acceptError && (
                        <div role="alert" className="mt-4 w-full space-y-2 text-left text-sm">
                            <p className="text-destructive">{t(acceptError.textKey)}</p>
                            {acceptError.retry && (
                                <button type="button" onClick={() => void accept()} disabled={accepting} className={secondaryClass}>
                                    {t('ext.accept.retry')}
                                </button>
                            )}
                        </div>
                    )}
                </Shell>
            );
        }
    }
}
